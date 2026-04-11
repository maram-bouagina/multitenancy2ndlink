$p = "c:\pfe tutorials\multitenancypfe\frontend\src\app\dashboard\invite\[token]\page.tsx"
$lines = Get-Content -LiteralPath $p
$s = ($lines | Select-String "async function handleLogin").LineNumber - 1
# find the closing brace after "Sign-in failed"
$e = ($lines | Select-String "Sign-in failed").LineNumber + 1
Write-Host "Removing lines $s to $e"
$newLines = $lines[0..($s-1)] + $lines[($e+1)..($lines.Length-1)]
Set-Content -LiteralPath $p -Value $newLines -Encoding UTF8
Write-Host "Done. Lines: $($newLines.Length)"
