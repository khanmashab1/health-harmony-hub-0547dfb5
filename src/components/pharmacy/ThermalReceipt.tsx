import { forwardRef } from "react";
import { format } from "date-fns";

interface ReceiptItem {
  medicine_name: string;
  quantity: number;
  unit_price: number;
}

interface ThermalReceiptProps {
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  saleDate?: Date;
  receiptNo?: string;
}

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ pharmacyName, pharmacyAddress, pharmacyPhone, customerName, customerPhone, items, subtotal, discount, total, paymentMethod, saleDate, receiptNo }, ref) => {
    const date = saleDate || new Date();

    return (
      <div ref={ref} className="hidden print:block">
        <style>{`
          @media print {
            @page {
              size: 80mm auto;
              margin: 2mm 3mm;
            }
            body * { visibility: hidden !important; }
            .thermal-receipt, .thermal-receipt * { visibility: visible !important; }
            .thermal-receipt {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              font-family: 'Courier New', monospace !important;
              font-size: 11px !important;
              color: #000 !important;
              background: #fff !important;
            }
          }
        `}</style>

        <div className="thermal-receipt" style={{ width: "80mm", fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#000", padding: "2mm" }}>
          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "1px" }}>{pharmacyName}</div>
            {pharmacyAddress && <div style={{ fontSize: "10px", marginTop: "2px" }}>{pharmacyAddress}</div>}
            {pharmacyPhone && <div style={{ fontSize: "10px" }}>Tel: {pharmacyPhone}</div>}
            <div style={{ fontSize: "10px", marginTop: "4px" }}>
              {format(date, "dd/MM/yyyy")} &nbsp; {format(date, "HH:mm:ss")}
            </div>
            {receiptNo && <div style={{ fontSize: "10px" }}>Receipt #: {receiptNo}</div>}
          </div>

          {/* Customer */}
          {(customerName || customerPhone) && (
            <div style={{ borderBottom: "1px dashed #000", paddingBottom: "4px", marginBottom: "4px", fontSize: "10px" }}>
              {customerName && <div>Customer: {customerName}</div>}
              {customerPhone && <div>Phone: {customerPhone}</div>}
            </div>
          )}

          {/* Column Headers */}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "2px", marginBottom: "4px", fontSize: "10px" }}>
            <span style={{ flex: 2 }}>Item</span>
            <span style={{ flex: 0.5, textAlign: "center" }}>Qty</span>
            <span style={{ flex: 0.8, textAlign: "right" }}>Price</span>
            <span style={{ flex: 0.8, textAlign: "right" }}>Total</span>
          </div>

          {/* Items */}
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontSize: "10px" }}>
              <span style={{ flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.medicine_name}</span>
              <span style={{ flex: 0.5, textAlign: "center" }}>{item.quantity}</span>
              <span style={{ flex: 0.8, textAlign: "right" }}>{item.unit_price}</span>
              <span style={{ flex: 0.8, textAlign: "right" }}>{(item.quantity * item.unit_price).toLocaleString()}</span>
            </div>
          ))}

          {/* Totals */}
          <div style={{ borderTop: "1px dashed #000", marginTop: "6px", paddingTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
              <span>Subtotal:</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span>Discount:</span>
                <span>-Rs. {discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", marginTop: "4px", borderTop: "1px solid #000", paddingTop: "4px" }}>
              <span>TOTAL:</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "2px" }}>
              <span>Payment:</span>
              <span>{paymentMethod}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", borderTop: "1px dashed #000", marginTop: "8px", paddingTop: "6px", fontSize: "10px" }}>
            <div style={{ fontWeight: "bold" }}>Thank you for your purchase!</div>
            <div style={{ marginTop: "2px" }}>Get well soon ❤</div>
            <div style={{ marginTop: "6px", fontSize: "9px", color: "#666" }}>Powered by MediCare+</div>
          </div>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = "ThermalReceipt";
export { ThermalReceipt };
export type { ThermalReceiptProps, ReceiptItem };
