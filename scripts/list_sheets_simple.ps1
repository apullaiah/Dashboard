Add-Type -AssemblyName System.IO.Compression.FileSystem

function List-Sheets($file) {
    Write-Host "=== $file ==="
    $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $file).Path)
    $wbXml = [xml](New-Object System.IO.StreamReader($zip.GetEntry('xl/workbook.xml').Open())).ReadToEnd()
    foreach ($s in $wbXml.workbook.sheets.sheet) {
        Write-Host "   Sheet: '$($s.name)' (sheetId: $($s.sheetId), rId: $($s.id))"
    }
    $zip.Dispose()
}

List-Sheets "scratch/test.xlsx"
List-Sheets "scratch/phase5.xlsx"
List-Sheets "scratch/phase6.xlsx"
List-Sheets "scratch/phase4.xlsx"
