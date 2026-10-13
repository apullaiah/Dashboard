Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-SharedStrings($zip) {
  $strings = @()
  $ssEntry = $zip.GetEntry('xl/sharedStrings.xml')
  if ($ssEntry) {
    $reader = New-Object System.IO.StreamReader($ssEntry.Open())
    $ssXml = [xml]$reader.ReadToEnd()
    foreach ($si in $ssXml.sst.si) {
      if ($si.t) { $strings += $si.t }
      elseif ($si.r) {
        $txt = ""
        foreach ($r in $si.r) { $txt += $r.t }
        $strings += $txt
      } else { $strings += "" }
    }
  }
  return $strings
}

function ExcelDate-ToIso($serial) {
  if (-not $serial) { return "" }
  $num = 0.0
  if ([double]::TryParse($serial, [ref]$num)) {
    if ($num -ge 40000 -and $num -le 60000) {
      $baseDate = [DateTime]::new(1899, 12, 30)
      $dt = $baseDate.AddDays([Math]::Round($num))
      return $dt.ToString("yyyy-MM-dd")
    }
  }
  $str = [string]$serial
  $m = [regex]::Match($str, '(\d{1,2})[-/](\d{1,2})[-/](\d{4})')
  if ($m.Success) {
    $d = $m.Groups[1].Value.PadLeft(2, '0')
    $mo = $m.Groups[2].Value.PadLeft(2, '0')
    $y = $m.Groups[3].Value
    return "$y-$mo-$d"
  }
  return $str
}

$results = @{}

# ==============================================================================
# 1. PARSE scratch/test.xlsx (ActionPlan & PPBs stagewise)
# ==============================================================================
Write-Host "Parsing scratch/test.xlsx..."
if (Test-Path "scratch/test.xlsx") {
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "scratch/test.xlsx").Path)
  $strings = Get-SharedStrings $zip

  # Sheet 3: ActionPlan
  $entry = $zip.GetEntry("xl/worksheets/sheet3.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    $sections = @(
      @{ tmCol='A'; mCol='B'; vCol='C'; cCol='D'; stageName='Mar-27 (Phase 6 / GT Ongoing)' },
      @{ tmCol='K'; mCol='L'; vCol='M'; cCol='N'; stageName='Feb-27 (Phase 7 / GT Not Started)' },
      @{ tmCol='W'; mCol='X'; vCol='Y'; cCol='Z'; stageName='Jan-27 (Phase 5 / VS-VRO)' },
      @{ tmCol='AG'; mCol='AH'; vCol='AI'; cCol='AJ'; stageName='Dec-26 (Phase 4/5 / Tah-RDO-JC)' },
      @{ tmCol='AR'; mCol='AS'; vCol='AT'; cCol='AU'; stageName='Nov-26 (13 Completed)' },
      @{ tmCol='BB'; mCol='BC'; vCol='BD'; cCol='BE'; stageName='Oct-26 (Final ROR Completed)' },
      @{ tmCol='BL'; mCol='BM'; vCol='BN'; cCol='BO'; stageName='Sep-26 (PPB Distribution)' },
      @{ tmCol='BW'; mCol='BX'; vCol='BY'; cCol='BZ'; stageName='Aug-26 (PPB Distribution Completed)' }
    )

    foreach ($row in $xml.worksheet.sheetData.row) {
      $rNum = [int]$row.r
      if ($rNum -ge 3) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }

        foreach ($sec in $sections) {
          $vCode = $rowCells[$sec.cCol]
          if ($vCode) {
            $codeClean = ($vCode -replace '\.0$', '').Trim()
            $mandal = $rowCells[$sec.mCol]
            $village = $rowCells[$sec.vCol]
            $tm = $rowCells[$sec.tmCol]

            if ($codeClean -and -not $results.ContainsKey($codeClean)) {
              $results[$codeClean] = @{
                village_code = $codeClean
                mandal = $mandal
                village_name = $village
                ppb_target_month = $tm
                stage_targets = @{}
                sources = @()
              }
            }
            if ($codeClean) {
              $results[$codeClean].ppb_target_month = $tm
              $results[$codeClean].sources += "test.xlsx:ActionPlan"
              if ($tm) {
                # Map target month to standardized YYYY-MM
                $dt = ""
                if ($tm -match 'Aug-26') { $dt = '2026-08-31' }
                elseif ($tm -match 'Sep-26') { $dt = '2026-09-30' }
                elseif ($tm -match 'Oct-26') { $dt = '2026-10-31' }
                elseif ($tm -match 'Nov-26') { $dt = '2026-11-30' }
                elseif ($tm -match 'Dec-26') { $dt = '2026-12-31' }
                elseif ($tm -match 'Jan-27') { $dt = '2027-01-31' }
                elseif ($tm -match 'Feb-27') { $dt = '2027-02-28' }
                elseif ($tm -match 'Mar-27') { $dt = '2027-03-31' }
                if ($dt) {
                  $results[$codeClean].stage_targets['ppb'] = $dt
                  $results[$codeClean].stage_targets['target_date'] = $dt
                }
              }
            }
          }
        }
      }
    }
  }

  # Sheet 2: PPBs stagewise (has exact PPB cycle dates)
  $entry2 = $zip.GetEntry("xl/worksheets/sheet2.xml")
  if ($entry2) {
    $xml2 = [xml](New-Object System.IO.StreamReader($entry2.Open())).ReadToEnd()
    foreach ($row in $xml2.worksheet.sheetData.row) {
      if ([int]$row.r -ge 2) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['D'] -replace '\.0$', '').Trim()
        $cycle = $rowCells['K']
        if ($vCode -and $cycle) {
          $iso = ExcelDate-ToIso $cycle
          if ($iso) {
            if (-not $results.ContainsKey($vCode)) {
              $results[$vCode] = @{
                village_code = $vCode
                mandal = $rowCells['B']
                village_name = $rowCells['C']
                stage_targets = @{}
                sources = @()
              }
            }
            $results[$vCode].stage_targets['ppb_cycle_date'] = $iso
            $results[$vCode].stage_targets['ppb'] = $iso
            $results[$vCode].stage_targets['target_date'] = $iso
            $results[$vCode].sources += "test.xlsx:PPBs_stagewise"
          }
        }
      }
    }
  }

  $zip.Dispose()
}

# ==============================================================================
# 2. PARSE scratch/phase5.xlsx
# ==============================================================================
Write-Host "Parsing scratch/phase5.xlsx..."
if (Test-Path "scratch/phase5.xlsx") {
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "scratch/phase5.xlsx").Path)
  $strings = Get-SharedStrings $zip

  # Sheet 3: Vectorization (Col E=Code, Col I=GT Comp, Col P=Vec Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet3.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['E'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['C']; village_name = $rowCells['D']; stage_targets = @{}; sources = @() }
          }
          $gtIso = ExcelDate-ToIso $rowCells['I']
          $vecIso = ExcelDate-ToIso $rowCells['P']
          if ($gtIso) { $results[$vCode].stage_targets['gt'] = $gtIso }
          if ($vecIso) { $results[$vCode].stage_targets['vectorization'] = $vecIso }
          $results[$vCode].sources += "phase5.xlsx:Vectorization"
        }
      }
    }
  }

  # Sheet 4: Correlation-Area Comparision (Col E=Code, Col M=Porting Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet4.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 3) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['E'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['C']; village_name = $rowCells['D']; stage_targets = @{}; sources = @() }
          }
          $pIso = ExcelDate-ToIso $rowCells['M']
          if ($pIso) { $results[$vCode].stage_targets['correlation_porting'] = $pIso }
          $results[$vCode].sources += "phase5.xlsx:Correlation"
        }
      }
    }
  }

  # Sheet 5: VS - VRO Login (Col F=Code, Col P=Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet5.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $tIso = ExcelDate-ToIso $rowCells['P']
          if ($tIso) {
            $results[$vCode].stage_targets['vs'] = $tIso
            $results[$vCode].stage_targets['vro'] = $tIso
          }
          $results[$vCode].sources += "phase5.xlsx:VS-VRO"
        }
      }
    }
  }

  # Sheet 6: Tah-RDO-JC Login (Col F=Code, Col P=Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet6.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $tIso = ExcelDate-ToIso $rowCells['P']
          if ($tIso) {
            $results[$vCode].stage_targets['tahsildar'] = $tIso
            $results[$vCode].stage_targets['rdo'] = $tIso
            $results[$vCode].stage_targets['jc'] = $tIso
          }
          $results[$vCode].sources += "phase5.xlsx:Tah-RDO-JC"
        }
      }
    }
  }

  # Sheet 8: DLR Completed (Col F=Code, Col K=Gazzette No & Date, Col L=Draft ROR, Col M=Final ROR)
  $entry = $zip.GetEntry("xl/worksheets/sheet8.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 3) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $gazVal = $rowCells['K']
          $gazIso = ExcelDate-ToIso $gazVal
          $draftIso = ExcelDate-ToIso $rowCells['L']
          $finalIso = ExcelDate-ToIso $rowCells['M']
          if ($gazIso) { $results[$vCode].stage_targets['section13'] = $gazIso }
          if ($draftIso) { $results[$vCode].stage_targets['draft_ror'] = $draftIso }
          if ($finalIso) { $results[$vCode].stage_targets['final_ror'] = $finalIso }
          $results[$vCode].sources += "phase5.xlsx:DLR_Completed"
        }
      }
    }
  }

  $zip.Dispose()
}

# ==============================================================================
# 3. PARSE scratch/phase6.xlsx
# ==============================================================================
Write-Host "Parsing scratch/phase6.xlsx..."
if (Test-Path "scratch/phase6.xlsx") {
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "scratch/phase6.xlsx").Path)
  $strings = Get-SharedStrings $zip

  # Sheet 3: Vectorization (Col E=Code, Col I=GT Comp, Col P=Vec Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet3.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['E'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['C']; village_name = $rowCells['D']; stage_targets = @{}; sources = @() }
          }
          $gtIso = ExcelDate-ToIso $rowCells['I']
          $vecIso = ExcelDate-ToIso $rowCells['P']
          if ($gtIso) { $results[$vCode].stage_targets['gt'] = $gtIso }
          if ($vecIso) { $results[$vCode].stage_targets['vectorization'] = $vecIso }
          $results[$vCode].sources += "phase6.xlsx:Vectorization"
        }
      }
    }
  }

  # Sheet 5: VS - VRO Login (Col F=Code, Col P=Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet5.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $tIso = ExcelDate-ToIso $rowCells['P']
          if ($tIso) {
            $results[$vCode].stage_targets['vs'] = $tIso
            $results[$vCode].stage_targets['vro'] = $tIso
          }
          $results[$vCode].sources += "phase6.xlsx:VS-VRO"
        }
      }
    }
  }

  # Sheet 6: TAH - RDO - JC LOGIN (Col F=Code, Col P=Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet6.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $tIso = ExcelDate-ToIso $rowCells['P']
          if ($tIso) {
            $results[$vCode].stage_targets['tahsildar'] = $tIso
            $results[$vCode].stage_targets['rdo'] = $tIso
            $results[$vCode].stage_targets['jc'] = $tIso
          }
          $results[$vCode].sources += "phase6.xlsx:Tah-RDO-JC"
        }
      }
    }
  }

  $zip.Dispose()
}

# ==============================================================================
# 4. PARSE scratch/phase4.xlsx
# ==============================================================================
Write-Host "Parsing scratch/phase4.xlsx..."
if (Test-Path "scratch/phase4.xlsx") {
  $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path "scratch/phase4.xlsx").Path)
  $strings = Get-SharedStrings $zip

  # Sheet 3: VS & VRO (Col F=Code, Col P=Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet3.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $tIso = ExcelDate-ToIso $rowCells['P']
          if ($tIso) {
            $results[$vCode].stage_targets['vs'] = $tIso
            $results[$vCode].stage_targets['vro'] = $tIso
          }
          $results[$vCode].sources += "phase4.xlsx:VS-VRO"
        }
      }
    }
  }

  # Sheet 4: Tah, RDO & JC Login (Col F=Code, Col P=Target Date)
  $entry = $zip.GetEntry("xl/worksheets/sheet4.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 4) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $tIso = ExcelDate-ToIso $rowCells['P']
          if ($tIso) {
            $results[$vCode].stage_targets['tahsildar'] = $tIso
            $results[$vCode].stage_targets['rdo'] = $tIso
            $results[$vCode].stage_targets['jc'] = $tIso
          }
          $results[$vCode].sources += "phase4.xlsx:Tah-RDO-JC"
        }
      }
    }
  }

  # Sheet 5: DLR Completed (Col F=Code, Col K=Gazzette No & Date, Col L=Draft ROR, Col M=Final ROR)
  $entry = $zip.GetEntry("xl/worksheets/sheet5.xml")
  if ($entry) {
    $xml = [xml](New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
    foreach ($row in $xml.worksheet.sheetData.row) {
      if ([int]$row.r -ge 3) {
        $rowCells = @{}
        foreach ($c in $row.c) {
          $col = ($c.r -replace '\d+', '')
          $val = $c.v
          if ($c.t -eq 's') { $val = $strings[[int]$val] }
          $rowCells[$col] = $val
        }
        $vCode = ($rowCells['F'] -replace '\.0$', '').Trim()
        if ($vCode) {
          if (-not $results.ContainsKey($vCode)) {
            $results[$vCode] = @{ village_code = $vCode; mandal = $rowCells['D']; village_name = $rowCells['E']; stage_targets = @{}; sources = @() }
          }
          $gazVal = $rowCells['K']
          $gazIso = ExcelDate-ToIso $gazVal
          $draftIso = ExcelDate-ToIso $rowCells['L']
          $finalIso = ExcelDate-ToIso $rowCells['M']
          if ($gazIso) { $results[$vCode].stage_targets['section13'] = $gazIso }
          if ($draftIso) { $results[$vCode].stage_targets['draft_ror'] = $draftIso }
          if ($finalIso) { $results[$vCode].stage_targets['final_ror'] = $finalIso }
          $results[$vCode].sources += "phase4.xlsx:DLR_Completed"
        }
      }
    }
  }

  $zip.Dispose()
}

$jsonPath = "scratch/extracted_local_targets.json"
$outObj = @{
  count = $results.Count
  villages = $results
}
$json = $outObj | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Resolve-Path ".").Path + "/" + $jsonPath, $json, [System.Text.Encoding]::UTF8)

Write-Host "`nExtraction Complete! Found $($results.Count) villages with timeline targets."
Write-Host "Output written to $jsonPath"
