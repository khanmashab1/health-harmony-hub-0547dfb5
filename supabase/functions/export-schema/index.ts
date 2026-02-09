import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      user_uuid: user.id,
      check_role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin verified, exporting schema...");

    // Get database connection
    const DB_URL = Deno.env.get("SUPABASE_DB_URL");
    if (!DB_URL) {
      return new Response(JSON.stringify({ error: "Database URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Import postgres client
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.4/mod.js");
    const sql = postgres(DB_URL);

    let schemaSQL = "";
    const timestamp = new Date().toISOString();

    // Header
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- MediCare+ Complete Database Schema Export\n`;
    schemaSQL += `-- Generated: ${timestamp}\n`;
    schemaSQL += `-- ============================================\n\n`;

    // 1. Extensions
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- EXTENSIONS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const extensions = await sql`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname NOT IN ('plpgsql')
      ORDER BY extname
    `;
    
    for (const ext of extensions) {
      schemaSQL += `CREATE EXTENSION IF NOT EXISTS "${ext.extname}";\n`;
    }
    schemaSQL += `\n`;

    // 2. Custom Types/Enums
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- CUSTOM TYPES & ENUMS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const enums = await sql`
      SELECT 
        t.typname AS enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `;
    
    for (const en of enums) {
      const values = en.enum_values.map((v: string) => `'${v}'`).join(", ");
      schemaSQL += `CREATE TYPE public.${en.enum_name} AS ENUM (${values});\n`;
    }
    schemaSQL += `\n`;

    // 3. Tables
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- TABLES\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    for (const table of tables) {
      const tableName = table.table_name;
      
      // Get columns
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      schemaSQL += `-- Table: ${tableName}\n`;
      schemaSQL += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
      
      const columnDefs: string[] = [];
      for (const col of columns) {
        let dataType = col.data_type;
        
        // Handle special types
        if (col.data_type === 'USER-DEFINED') {
          dataType = `public.${col.udt_name}`;
        } else if (col.data_type === 'ARRAY') {
          dataType = `${col.udt_name.replace('_', '')}[]`;
        } else if (col.character_maximum_length) {
          dataType = `${col.data_type}(${col.character_maximum_length})`;
        }
        
        let colDef = `  ${col.column_name} ${dataType}`;
        if (col.is_nullable === 'NO') colDef += ' NOT NULL';
        if (col.column_default) colDef += ` DEFAULT ${col.column_default}`;
        
        columnDefs.push(colDef);
      }
      
      // Get primary keys
      const pkeys = await sql`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = ${`public.${tableName}`}::regclass AND i.indisprimary
      `;
      
      if (pkeys.length > 0) {
        const pkCols = pkeys.map((p: { attname: string }) => p.attname).join(', ');
        columnDefs.push(`  PRIMARY KEY (${pkCols})`);
      }
      
      schemaSQL += columnDefs.join(',\n');
      schemaSQL += `\n);\n\n`;
    }

    // 4. Views
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- VIEWS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const views = await sql`
      SELECT viewname, definition 
      FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY viewname
    `;
    
    for (const view of views) {
      schemaSQL += `-- View: ${view.viewname}\n`;
      schemaSQL += `CREATE OR REPLACE VIEW public.${view.viewname} AS\n${view.definition}\n\n`;
    }

    // 5. Functions
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- FUNCTIONS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const functions = await sql`
      SELECT 
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_def
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      ORDER BY p.proname
    `;
    
    for (const func of functions) {
      schemaSQL += `-- Function: ${func.function_name}\n`;
      schemaSQL += `${func.function_def};\n\n`;
    }

    // 6. Triggers
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- TRIGGERS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const triggers = await sql`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `;
    
    for (const trigger of triggers) {
      schemaSQL += `-- Trigger: ${trigger.trigger_name} on ${trigger.event_object_table}\n`;
      schemaSQL += `CREATE TRIGGER ${trigger.trigger_name}\n`;
      schemaSQL += `  ${trigger.action_timing} ${trigger.event_manipulation}\n`;
      schemaSQL += `  ON public.${trigger.event_object_table}\n`;
      schemaSQL += `  FOR EACH ROW\n`;
      schemaSQL += `  ${trigger.action_statement};\n\n`;
    }

    // 7. RLS Policies
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- ROW LEVEL SECURITY (RLS) POLICIES\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    // Enable RLS on tables
    const rlsTables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
        AND tablename IN (
          SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        )
      ORDER BY tablename
    `;
    
    for (const t of rlsTables) {
      schemaSQL += `ALTER TABLE public.${t.tablename} ENABLE ROW LEVEL SECURITY;\n`;
    }
    schemaSQL += `\n`;
    
    // Get all policies
    const policies = await sql`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `;
    
    for (const policy of policies) {
      schemaSQL += `-- Policy: ${policy.policyname} on ${policy.tablename}\n`;
      schemaSQL += `CREATE POLICY "${policy.policyname}"\n`;
      schemaSQL += `  ON public.${policy.tablename}\n`;
      schemaSQL += `  AS ${policy.permissive}\n`;
      schemaSQL += `  FOR ${policy.cmd}\n`;
      schemaSQL += `  TO ${policy.roles.join(', ')}\n`;
      if (policy.qual) {
        schemaSQL += `  USING (${policy.qual})\n`;
      }
      if (policy.with_check) {
        schemaSQL += `  WITH CHECK (${policy.with_check})\n`;
      }
      schemaSQL += `;\n\n`;
    }

    // 8. Indexes
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- INDEXES\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const indexes = await sql`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `;
    
    for (const idx of indexes) {
      schemaSQL += `${idx.indexdef};\n`;
    }
    schemaSQL += `\n`;

    // 9. Foreign Keys
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- FOREIGN KEY CONSTRAINTS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const fkeys = await sql`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;
    
    for (const fk of fkeys) {
      schemaSQL += `ALTER TABLE public.${fk.table_name}\n`;
      schemaSQL += `  ADD CONSTRAINT ${fk.constraint_name}\n`;
      schemaSQL += `  FOREIGN KEY (${fk.column_name})\n`;
      schemaSQL += `  REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});\n\n`;
    }

    // 10. Storage buckets (from Supabase API)
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- STORAGE BUCKETS\n`;
    schemaSQL += `-- ============================================\n\n`;
    
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (buckets) {
      for (const bucket of buckets) {
        schemaSQL += `-- Bucket: ${bucket.name} (public: ${bucket.public})\n`;
        schemaSQL += `INSERT INTO storage.buckets (id, name, public)\n`;
        schemaSQL += `VALUES ('${bucket.id}', '${bucket.name}', ${bucket.public})\n`;
        schemaSQL += `ON CONFLICT (id) DO NOTHING;\n\n`;
      }
    }

    // Storage policies
    const storagePolicies = await sql`
      SELECT 
        policyname,
        tablename,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'storage'
      ORDER BY tablename, policyname
    `;
    
    if (storagePolicies.length > 0) {
      schemaSQL += `-- Storage Policies\n`;
      for (const policy of storagePolicies) {
        schemaSQL += `CREATE POLICY "${policy.policyname}"\n`;
        schemaSQL += `  ON storage.${policy.tablename}\n`;
        schemaSQL += `  AS ${policy.permissive}\n`;
        schemaSQL += `  FOR ${policy.cmd}\n`;
        schemaSQL += `  TO ${policy.roles.join(', ')}\n`;
        if (policy.qual) {
          schemaSQL += `  USING (${policy.qual})\n`;
        }
        if (policy.with_check) {
          schemaSQL += `  WITH CHECK (${policy.with_check})\n`;
        }
        schemaSQL += `;\n\n`;
      }
    }

    // Footer
    schemaSQL += `-- ============================================\n`;
    schemaSQL += `-- END OF SCHEMA EXPORT\n`;
    schemaSQL += `-- ============================================\n`;

    await sql.end();

    console.log("Schema export completed successfully");

    return new Response(JSON.stringify({ schema: schemaSQL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Schema export error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to export schema", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
