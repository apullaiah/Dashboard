Add-Type -AssemblyName System.IO.Compression.FileSystem

$files = @(
  @{ name = "PPB Universe"; path = "scratch/test.xlsx" },
  @{ name = "Phase 5"; path = "scratch/phase5.xlsx" },
  @{ name = "Phase 6"; path = "scratch/phase6.xlsx" },
  @{ name = "Phase 4"; path = "scratch/phase4.xlsx" }
)

foreach ($f in $files) {
  Write-Host "=== $($f.name) ($($f.path)) ==="
  if (Test-Path $f.path) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $f.path).Path)
    $entry = $zip.GetEntry("xl/workbook.xml")
    if ($entry) {
      $reader = New-Object System.IO.StreamReader($entry.Open())
      $xml = [xml]$reader.ReadToEnd()
      foreach ($s in $xml.workbook.sheets.sheet) {
        Write-Host "   sheetId=$($s.sheetId) name='$($s.name)' state='$($s.state)'"
      }
    }
    $zip.Dispose()
  }
}
