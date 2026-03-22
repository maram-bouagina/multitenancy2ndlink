# API test script for multitenancypfe (PowerShell)
# Run from repository root: powershell -NoProfile -File .\scripts\run_api_tests.ps1

$base = 'http://localhost:8000'

# Use a unique suffix to avoid conflicts with existing tenants/stores/products
$suffix = [guid]::NewGuid().ToString().Substring(0,8)

$tenantEmail = "merchant$suffix@test.com"
$tenantEmail2 = "merchant2$suffix@test.com"
$tenantEmail3 = "merchant3$suffix@test.com"
$storeSlug = "ma-boutique-$suffix"

function Send-Request($method, $path, $body, $token=$null) {
    $uri = "$base$path"
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    try {
        $resp = Invoke-WebRequest -Uri $uri -Method $method -Body $body -ContentType 'application/json' -Headers $headers -UseBasicParsing -ErrorAction Stop
        return @{ Status = $resp.StatusCode; Body = $resp.Content }
    } catch {
        $err = $_.Exception
        if ($err.Response) {
            $code = $err.Response.StatusCode.Value__
            $sr = New-Object System.IO.StreamReader($err.Response.GetResponseStream())
            $bodyText = $sr.ReadToEnd()
            return @{ Status = $code; Body = $bodyText }
        }
        return @{ Status = 0; Body = $_.Exception.Message }
    }
}

function PrintResult($label, $res) {
    Write-Host "[$label] status=$($res.Status)" -ForegroundColor Cyan
    Write-Host $res.Body
    Write-Host "----"
}

# STEP 1: Create Tenant
$tenantBody = '{"email":"' + $tenantEmail + '","password":"password123","first_name":"Ahmed","last_name":"Ben Ali","phone":"+21612345678","plan":"pro"}'
$res = Send-Request -method Post -path '/api/tenants' -body $tenantBody
PrintResult 'STEP1 create tenant (valid)' $res
$tenantId = $null
if ($res.Status -eq 201) {
    $json = $res.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($json -ne $null) { $tenantId = $json.id }
}

# invalid plan
$tenantBodyBadPlan = '{"email":"' + $tenantEmail2 + '","password":"password123","first_name":"Ahmed","last_name":"Ben Ali","phone":"+21612345678","plan":"gold"}'
$res = Send-Request -method Post -path '/api/tenants' -body $tenantBodyBadPlan
PrintResult 'STEP1 create tenant (invalid plan)' $res

# short password
$tenantBodyBadPwd = '{"email":"' + $tenantEmail3 + '","password":"123","first_name":"Ahmed","last_name":"Ben Ali","phone":"+21612345678","plan":"pro"}'
$res = Send-Request -method Post -path '/api/tenants' -body $tenantBodyBadPwd
PrintResult 'STEP1 create tenant (short password)' $res

# duplicate email
$res = Send-Request -method Post -path '/api/tenants' -body $tenantBody
PrintResult 'STEP1 create tenant (duplicate email)' $res

# STEP 2: Login
$loginBody = '{"email":"' + $tenantEmail + '","password":"password123"}'
$res = Send-Request -method Post -path '/api/auth/tenant/login' -body $loginBody
PrintResult 'STEP2 login (valid)' $res
$token = $null
if ($res.Status -eq 200) {
    $json = $res.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($json -ne $null) { $token = $json.token }
}

# wrong password
$loginBodyBad = '{"email":"' + $tenantEmail + '","password":"wrongpass"}'
$res = Send-Request -method Post -path '/api/auth/tenant/login' -body $loginBodyBad
PrintResult 'STEP2 login (wrong password)' $res

# unknown email
$unknownEmail = "unknown$suffix@test.com"
$loginBodyUnknown = '{"email":"' + $unknownEmail + '","password":"password123"}'
$res = Send-Request -method Post -path '/api/auth/tenant/login' -body $loginBodyUnknown
PrintResult 'STEP2 login (unknown email)' $res

if (-not $token) {
    Write-Host 'No token obtained; stopping further tests.' -ForegroundColor Red
    exit 1
}

# STEP 3: Create Store
$storeBody = '{"name":"Ma Boutique","slug":"' + $storeSlug + '","email":"shop@test.com","phone":"+21612345678","address":"Tunis, Tunisie","logo":"https://example.com/logo.png","currency":"TND","timezone":"Africa/Tunis","language":"fr","tax_number":"12345678"}'
$res = Send-Request -method Post -path '/api/stores' -body $storeBody -token $token
PrintResult 'STEP3 create store (valid)' $res
$storeId = $null
if ($res.Status -eq 201) {
    $json = $res.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($json -ne $null) { $storeId = $json.id }
}

# missing currency
$storeBodyNoCurrency = '{"name":"Ma Boutique","slug":"ma-boutique2-' + $suffix + '","email":"shop2' + $suffix + '@test.com","phone":"+21612345678","address":"Tunis, Tunisie","logo":"https://example.com/logo.png","timezone":"Africa/Tunis","language":"fr","tax_number":"12345678"}'
$res = Send-Request -method Post -path '/api/stores' -body $storeBodyNoCurrency -token $token
PrintResult 'STEP3 create store (no currency)' $res

# missing timezone
$storeBodyNoTimezone = '{"name":"Ma Boutique","slug":"ma-boutique3-' + $suffix + '","email":"shop3' + $suffix + '@test.com","phone":"+21612345678","address":"Tunis, Tunisie","logo":"https://example.com/logo.png","currency":"TND","language":"fr","tax_number":"12345678"}'
$res = Send-Request -method Post -path '/api/stores' -body $storeBodyNoTimezone -token $token
PrintResult 'STEP3 create store (no timezone)' $res

# duplicate slug (if storeId exists)
if ($storeId) {
    $res = Send-Request -method Post -path '/api/stores' -body $storeBody -token $token
    PrintResult 'STEP3 create store (duplicate slug)' $res
}

# STEP 4: Products (requires storeId)
if (-not $storeId) {
    Write-Host 'No storeId available; cannot continue product tests.' -ForegroundColor Yellow
    exit 0
}

# Valid product create
$productBody = '{"title":"Chaussures Nike Air Max","description":"Confortables et légères","slug":"chaussures-nike-air-max","status":"draft","visibility":"public","price":199.99,"sale_price":null,"currency":"TND","sku":"NIKE-AM-001","track_stock":true,"stock":50,"low_stock_threshold":5,"weight":0.8,"dimensions":"30x15x10","brand":"Nike","tax_class":"standard"}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $productBody -token $token
PrintResult 'PROD create product (valid)' $res
$productId = $null
if ($res.Status -eq 201) {
    $json = $res.Body | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($json -ne $null) { $productId = $json.id }
}

# Missing title
$bad1 = '{"status":"draft","visibility":"public","price":50.00,"currency":"TND","track_stock":false,"stock":0}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $bad1 -token $token
PrintResult 'PROD missing title' $res

# Invalid status
$bad2 = '{"title":"Test","status":"INVALID","visibility":"public","price":50.00,"currency":"TND","track_stock":false,"stock":0}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $bad2 -token $token
PrintResult 'PROD invalid status' $res

# Negative price
$bad3 = '{"title":"Test","status":"draft","visibility":"public","price":-10,"currency":"TND","track_stock":false,"stock":0}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $bad3 -token $token
PrintResult 'PROD negative price' $res

# Wrong currency length
$bad4 = '{"title":"Test","status":"draft","visibility":"public","price":50.00,"currency":"TN","track_stock":false,"stock":0}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $bad4 -token $token
PrintResult 'PROD wrong currency length' $res

# Sale dates validation
$saleOk = '{"title":"Produit Soldé","status":"draft","visibility":"public","price":100.00,"sale_price":75.00,"sale_start":"2024-01-01T00:00:00Z","sale_end":"2030-12-31T23:59:59Z","currency":"TND","track_stock":false,"stock":0}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $saleOk -token $token
PrintResult 'PROD sale valid' $res

$saleBad = '{"title":"Test Solde","status":"draft","visibility":"public","price":100.00,"sale_price":75.00,"sale_start":"2030-01-01T00:00:00Z","sale_end":"2025-01-01T00:00:00Z","currency":"TND","track_stock":false,"stock":0}'
$res = Send-Request -method Post -path "/api/stores/$storeId/products" -body $saleBad -token $token
PrintResult 'PROD sale end before start' $res

# Cleanup: delete the created product if exists
if ($productId) {
    $res = Send-Request -method Delete -path "/api/stores/$storeId/products/$productId" -body '' -token $token
    PrintResult 'PROD delete product' $res
    # Verify deleted
    $res = Send-Request -method Get -path "/api/stores/$storeId/products/$productId" -body '' -token $token
    PrintResult 'PROD get deleted product' $res
}

Write-Host 'Finished full API test run.' -ForegroundColor Green
