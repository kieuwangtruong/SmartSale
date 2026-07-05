import * as xlsx from 'xlsx'

/**
 * Xuất dữ liệu mảng đối tượng ra file Excel
 * @param data Mảng các đối tượng dữ liệu cần xuất
 * @param fileName Tên file (không cần .xlsx)
 */
export function exportToExcel(data: any[], fileName: string) {
  const worksheet = xlsx.utils.json_to_sheet(data)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Data')
  
  xlsx.writeFile(workbook, `${fileName}.xlsx`)
}

/**
 * Đọc file Excel tải lên và chuyển thành mảng đối tượng
 * @param file File tải lên (File object)
 * @returns Promise chứa mảng các đối tượng
 */
export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) throw new Error('Không thể đọc file')
        
        const workbook = xlsx.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) throw new Error('File Excel rỗng')
        const worksheet = workbook.Sheets[firstSheetName]
        if (!worksheet) throw new Error('Không tìm thấy sheet dữ liệu')
        const json = xlsx.utils.sheet_to_json(worksheet)
        resolve(json)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsBinaryString(file)
  })
}
