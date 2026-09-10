import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { InvoiceWithDetails, Settings } from '../lib/api'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#666',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 8,
    textTransform: 'uppercase' as const,
    color: '#999',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  clientDetail: {
    color: '#666',
    marginBottom: 2,
  },
  dates: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '1 solid #e5e5e5',
  },
  dateBox: {
    width: 100,
  },
  dateValue: {
    fontFamily: 'Courier',
    fontSize: 11,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e5e5',
    paddingBottom: 8,
    marginBottom: 8,
    fontSize: 8,
    textTransform: 'uppercase' as const,
    color: '#999',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottom: '1 solid #f0f0f0',
  },
  colDescription: {
    flex: 1,
  },
  colQty: {
    width: 50,
    textAlign: 'right' as const,
    fontFamily: 'Courier',
  },
  colRate: {
    width: 70,
    textAlign: 'right' as const,
    fontFamily: 'Courier',
  },
  colAmount: {
    width: 80,
    textAlign: 'right' as const,
    fontFamily: 'Courier',
  },
  totalRow: {
    flexDirection: 'row',
    paddingTop: 12,
    marginTop: 8,
    borderTop: '1 solid #1a1a1a',
  },
  totalLabel: {
    flex: 1,
    textAlign: 'right' as const,
    fontFamily: 'Helvetica-Bold',
    paddingRight: 20,
  },
  totalAmount: {
    width: 80,
    textAlign: 'right' as const,
    fontFamily: 'Courier-Bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 40,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center' as const,
    borderTop: '1 solid #e5e5e5',
    paddingTop: 12,
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fafafa',
  },
  notesLabel: {
    fontSize: 8,
    textTransform: 'uppercase' as const,
    color: '#999',
    marginBottom: 6,
  },
  notesText: {
    color: '#666',
    lineHeight: 1.5,
  },
  parties: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 30,
  },
  partyBox: {
    flex: 1,
  },
  businessName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  businessDetail: {
    color: '#666',
    marginBottom: 2,
  },
  paymentInstructions: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
})

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

interface InvoicePDFProps {
  invoice: InvoiceWithDetails
  settings: Settings | null
}

export function InvoicePDF({ invoice, settings }: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.sectionLabel}>Amount Due</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Courier-Bold' }}>
              {formatCurrency(invoice.subtotal)}
            </Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.sectionLabel}>From</Text>
            {settings?.business_name ? (
              <>
                <Text style={styles.businessName}>{settings.business_name}</Text>
                {settings.business_email && (
                  <Text style={styles.businessDetail}>{settings.business_email}</Text>
                )}
                {settings.business_address && (
                  <Text style={styles.businessDetail}>{settings.business_address}</Text>
                )}
              </>
            ) : (
              <Text style={styles.businessDetail}>—</Text>
            )}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.client_name}</Text>
            {invoice.client_email && (
              <Text style={styles.clientDetail}>{invoice.client_email}</Text>
            )}
            {invoice.client_address && (
              <Text style={styles.clientDetail}>{invoice.client_address}</Text>
            )}
          </View>
        </View>

        <View style={styles.dates}>
          <View style={styles.dateBox}>
            <Text style={styles.sectionLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>{invoice.issue_date}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.sectionLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{invoice.due_date}</Text>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.sectionLabel}>Status</Text>
            <Text style={styles.dateValue}>{invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {invoice.line_items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
        </View>

        {settings?.payment_instructions && (
          <View style={styles.paymentInstructions}>
            <Text style={styles.notesLabel}>Payment Instructions</Text>
            <Text style={styles.notesText}>{settings.payment_instructions}</Text>
          </View>
        )}

        {(invoice.notes || settings?.invoice_notes) && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes || settings?.invoice_notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>{settings?.invoice_notes ? settings.invoice_notes : 'Thank you for your business'}</Text>
        </View>
      </Page>
    </Document>
  )
}
