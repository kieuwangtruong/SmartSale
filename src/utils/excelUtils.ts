import * as xlsx from 'xlsx'

/**
 * Xuất dữ liệu mảng đối tượng ra file Excel (.xlsx) với độ rộng cột tự động và chuẩn UTF-8
 * @param data Mảng các đối tượng dữ liệu cần xuất
 * @param fileName Tên file (không cần .xlsx)
 */
export function exportToExcel(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    const emptyWs = xlsx.utils.aoa_to_sheet([['Không có dữ liệu để xuất']])
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, emptyWs, 'Data')
    xlsx.writeFile(wb, `${fileName}.xlsx`)
    return
  }

  const worksheet = xlsx.utils.json_to_sheet(data)

  // Tự động căn chỉnh độ rộng cột theo độ dài nội dung
  const keys = Object.keys(data[0] || {})
  const colWidths = keys.map((key) => {
    let maxLen = key.toString().length
    data.forEach((row) => {
      const val = row[key]
      if (val !== null && val !== undefined) {
        const len = String(val).length
        if (len > maxLen) maxLen = len
      }
    })
    return { wch: Math.min(Math.max(maxLen + 4, 12), 60) }
  })
  worksheet['!cols'] = colWidths

  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Data')
  
  xlsx.writeFile(workbook, `${fileName}.xlsx`)
}

/**
 * Đọc file Excel (.xlsx, .xls) và chuyển thành mảng đối tượng
 * Sử dụng ArrayBuffer để hỗ trợ chuẩn xác 100% tiếng Việt có dấu (UTF-8)
 * Tự động loại bỏ khoảng trắng thừa ở tên cột
 * @param file File tải lên (File object)
 * @returns Promise chứa mảng các đối tượng
 */
export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result
        if (!buffer) throw new Error('Không thể đọc dữ liệu file.')
        
        const workbook = xlsx.read(buffer, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
        })

        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) throw new Error('File Excel không có trang tính (Sheet) nào.')
        
        const worksheet = workbook.Sheets[firstSheetName]
        if (!worksheet) throw new Error('Không tìm thấy dữ liệu trong trang tính.')
        
        const rawJson: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false })
        
        // Chuẩn hóa: Trim các key để tránh lỗi do dấu cách thừa ở tiêu đề cột
        const cleanJson = rawJson.map((row) => {
          const newRow: Record<string, any> = {}
          Object.keys(row).forEach((k) => {
            const cleanKey = k.trim()
            newRow[cleanKey] = typeof row[k] === 'string' ? row[k].trim() : row[k]
          })
          return newRow
        })

        resolve(cleanJson)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}
