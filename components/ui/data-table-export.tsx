"use client"

import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface DataTableExportProps<T> {
    data: T[]
    columns: { header: string; accessorKey: keyof T }[]
    filename?: string
    title?: string
    headerInfo?: {
        troopName?: string
        council?: string
        district?: string
        address?: string
    }
}

export function DataTableExport<T>({ data, columns, filename = "export", title = "Report", headerInfo }: DataTableExportProps<T>) {

    const getRowData = (row: T) => {
        return columns.map(col => {
            return row[col.accessorKey]
        })
    }

    const downloadBlob = (blob: Blob, fileName: string) => {
        // Use setTimeout to detach from the immediate event loop
        setTimeout(() => {
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = url
            a.setAttribute('download', fileName) // Explicitly set attribute
            document.body.appendChild(a)

            a.click()

            // Cleanup after a small delay to ensure click processed
            setTimeout(() => {
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
            }, 100)
        }, 0)
    }

    const handleExportExcel = () => {
        console.log("Exporting Excel with filename:", filename)

        let headerRows: any[] = []
        if (headerInfo) {
            headerRows = [
                [headerInfo.troopName || "Troop Treasury"],
                [`${headerInfo.council || ""} - ${headerInfo.district || ""}`],
                [headerInfo.address || ""],
                [`Export Date: ${new Date().toLocaleString()}`],
                [] // Empty row separator
            ]
        }

        const headers = columns.map(c => c.header)
        const rows = data.map(getRowData)

        const worksheetData = [...headerRows, headers, ...rows]
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")

        // Write to buffer and download manually to force filename
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadBlob(blob, `${filename}.xlsx`)
    }

    const handleExportPDF = () => {
        console.log("Exporting PDF with filename:", filename)
        const doc = new jsPDF()

        let startY = 15;
        if (headerInfo) {
            doc.setFontSize(14)
            doc.text(headerInfo.troopName || "Troop Treasury", 14, startY)
            startY += 7

            doc.setFontSize(10)
            doc.text(`${headerInfo.council || ""} - ${headerInfo.district || ""}`, 14, startY)
            startY += 5

            if (headerInfo.address) {
                doc.text(headerInfo.address, 14, startY)
                startY += 5
            }

            doc.text(`Export Date: ${new Date().toLocaleString()}`, 14, startY)
            startY += 10
        }

        doc.setFontSize(12)
        doc.text(title || "Report", 14, startY)
        startY += 5

        const headers = columns.map(c => c.header)
        const rows = data.map(getRowData) as any[][] // autotable expects any[][]

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: startY,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        })

        // Output as blob and download manually
        const blob = doc.output('blob')
        downloadBlob(blob, `${filename}.pdf`)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto flex gap-2">
                    <Download className="w-4 h-4" />
                    Export Data
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export to PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
