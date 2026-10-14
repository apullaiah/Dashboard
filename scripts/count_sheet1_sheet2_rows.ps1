Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 'scratch/test.xlsx').Path)

$entry = $zip.GetEntry('xl/worksheets/sheet1.xml')
$reader = New-Object System.IO.StreamReader($entry.Open())
$xml = [xml]$reader.ReadToEnd()
Write-Host "Total rows in Sheet 1 (Consolidated_Data):" $xml.worksheet.sheetData.row.Count

$entry2 = $zip.GetEntry('xl/worksheets/sheet2.xml')
$reader2 = New-Object System.IO.StreamReader($entry2.Open())
$xml2 = [xml]$reader2.ReadToEnd()
Write-Host "Total rows in Sheet 2 (PPBs stagewise):" $xml2.worksheet.sheetData.row.Count

$zip.Dispose()
