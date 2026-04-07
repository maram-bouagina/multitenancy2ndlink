package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"
)

type categoryRow struct {
	id         string
	name       string
	slug       string
	parentID   string
	parentSlug string
	visibility string
	noindex    bool
	imageURL   string
}

type collectionRow struct {
	id       string
	name     string
	slug     string
	kind     string
	rule     string
	noindex  bool
	imageURL string
}

type productImageSet struct {
	primary string
	others  []string
}

func main() {
	root := filepath.Join("exports")
	if err := os.MkdirAll(root, 0o755); err != nil {
		panic(err)
	}

	categories := buildCategories()

	files := []struct {
		name string
		rows [][]string
	}{
		{
			name: "categories_bulk_test.xlsx",
			rows: buildCategoryRows(categories),
		},
		{
			name: "products_bulk_test.xlsx",
			rows: buildProductRows(categories),
		},
		{
			name: "collections_bulk_test.xlsx",
			rows: buildCollectionRows(),
		},
		{
			name: "tags_bulk_test.xlsx",
			rows: buildTagRows(),
		},
	}

	for _, file := range files {
		path := filepath.Join(root, file.name)
		if err := writeWorkbook(path, file.rows); err != nil {
			fallback := strings.TrimSuffix(path, filepath.Ext(path)) + "_updated" + filepath.Ext(path)
			if fallbackErr := writeWorkbook(fallback, file.rows); fallbackErr != nil {
				panic(err)
			}
			fmt.Println("generated", fallback)
			continue
		}
		fmt.Println("generated", path)
	}
}

func writeWorkbook(path string, rows [][]string) error {
	f := excelize.NewFile()
	sheet := "Template"
	f.SetSheetName("Sheet1", sheet)

	for rowIndex, row := range rows {
		for colIndex, value := range row {
			cell, _ := excelize.CoordinatesToCellName(colIndex+1, rowIndex+1)
			if err := f.SetCellValue(sheet, cell, value); err != nil {
				return err
			}
		}
	}

	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	lastCell, _ := excelize.CoordinatesToCellName(len(rows[0]), 1)
	_ = f.SetCellStyle(sheet, "A1", lastCell, boldStyle)
	_ = f.SetPanes(sheet, &excelize.Panes{Freeze: true, Split: false, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"})

	for index := range rows[0] {
		colName, _ := excelize.ColumnNumberToName(index + 1)
		_ = f.SetColWidth(sheet, colName, colName, 20)
	}

	return f.SaveAs(path)
}

func buildCategories() []categoryRow {
	return []categoryRow{
		{id: "85502ea5-5cac-4621-bc93-11ae2b199342", name: "Fashion", slug: "fashion", visibility: "private", noindex: true, imageURL: "https://picsum.photos/id/1011/1200/800"},
		{id: "340e54af-8011-47b5-b175-aaf0f9609bd9", name: "Beauty", slug: "beauty", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/1060/1200/800"},
		{id: "cfd78dd0-f1c1-4c69-abc3-5e983bef311e", name: "Home", slug: "home", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/133/1200/800"},
		{id: "05deb3bd-17bc-4f6d-88e7-16e10db1128f", name: "Electronics", slug: "electronics", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/367/1200/800"},
		{id: "fbb4b445-bacf-4a60-a675-268ba465ae3c", name: "Sports", slug: "sports", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/1015/1200/800"},
		{id: "a917e596-6bc2-4aef-a76a-08ead0654060", name: "Kids", slug: "kids", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/201/1200/800"},
		{id: "67a29122-41b8-4f5a-9dcb-daf56fba71d0", name: "Kitchen", slug: "home-kitchen", parentID: "cfd78dd0-f1c1-4c69-abc3-5e983bef311e", parentSlug: "home", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/292/1200/800"},
		{id: "378c7415-5587-4295-9d62-2d49acc1f6da", name: "Decor", slug: "home-decor", parentID: "cfd78dd0-f1c1-4c69-abc3-5e983bef311e", parentSlug: "home", visibility: "private", noindex: false, imageURL: "https://picsum.photos/id/133/1200/800"},
		{id: "3ef15c18-56ac-40c5-8070-4e2c8ee69bc7", name: "Storage", slug: "home-storage", parentID: "cfd78dd0-f1c1-4c69-abc3-5e983bef311e", parentSlug: "home", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/180/1200/800"},
		{id: "be6439e8-647e-4e4e-80f2-3b118c91a981", name: "Audio", slug: "electronics-audio", parentID: "05deb3bd-17bc-4f6d-88e7-16e10db1128f", parentSlug: "electronics", visibility: "public", noindex: true, imageURL: "https://picsum.photos/id/367/1200/800"},
		{id: "42a927d5-a8e5-4860-bb62-d43e50c03c38", name: "Mobile", slug: "electronics-mobile", parentID: "05deb3bd-17bc-4f6d-88e7-16e10db1128f", parentSlug: "electronics", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/1015/1200/800"},
		{id: "5d7e7d91-95d1-4c69-8cc3-150d0e4af525", name: "Gaming", slug: "electronics-gaming", parentID: "05deb3bd-17bc-4f6d-88e7-16e10db1128f", parentSlug: "electronics", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/106/1200/800"},
		{id: "cc908c16-0ef7-4f6c-8f82-e110816f991f", name: "Fitness", slug: "sports-fitness", parentID: "fbb4b445-bacf-4a60-a675-268ba465ae3c", parentSlug: "sports", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/201/1200/800"},
		{id: "e87b36c8-a5d4-4c59-a9e0-3c3083d95a29", name: "Outdoor", slug: "sports-outdoor", parentID: "fbb4b445-bacf-4a60-a675-268ba465ae3c", parentSlug: "sports", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/133/1200/800"},
		{id: "15807b63-ab9b-426e-a609-eb8ff8902763", name: "Running", slug: "sports-running", parentID: "fbb4b445-bacf-4a60-a675-268ba465ae3c", parentSlug: "sports", visibility: "private", noindex: false, imageURL: "https://picsum.photos/id/180/1200/800"},
		{id: "ec1c283c-63dc-49c1-9038-d8c4d4ea150e", name: "Baby", slug: "kids-baby", parentID: "a917e596-6bc2-4aef-a76a-08ead0654060", parentSlug: "kids", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/292/1200/800"},
		{id: "24c4833f-1c7c-45b6-a018-2621adc0333e", name: "Toys", slug: "kids-toys", parentID: "a917e596-6bc2-4aef-a76a-08ead0654060", parentSlug: "kids", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/1015/1200/800"},
		{id: "4ca49ab7-aa5f-4e53-b35b-536ea972f3df", name: "School", slug: "kids-school", parentID: "a917e596-6bc2-4aef-a76a-08ead0654060", parentSlug: "kids", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/106/1200/800"},
		{id: "fdde78c3-08ed-459e-ae98-053edc01001d", name: "Women", slug: "fashion-women", parentID: "85502ea5-5cac-4621-bc93-11ae2b199342", parentSlug: "fashion", visibility: "public", noindex: true, imageURL: "https://picsum.photos/id/201/1200/800"},
		{id: "ae7981fa-ca7a-4bf4-b417-35e38953b5d0", name: "Men", slug: "fashion-men", parentID: "85502ea5-5cac-4621-bc93-11ae2b199342", parentSlug: "fashion", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/133/1200/800"},
		{id: "eecab967-45fb-476b-89d2-06fc5d592818", name: "Accessories", slug: "fashion-accessories", parentID: "85502ea5-5cac-4621-bc93-11ae2b199342", parentSlug: "fashion", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/180/1200/800"},
		{id: "5750b683-b1b3-4dbc-aebf-ff24c195f5b7", name: "Skincare", slug: "beauty-skincare", parentID: "340e54af-8011-47b5-b175-aaf0f9609bd9", parentSlug: "beauty", visibility: "private", noindex: false, imageURL: "https://picsum.photos/id/1060/1200/800"},
		{id: "f6633676-b35c-4e9e-9e0f-b6d4843cdda8", name: "Makeup", slug: "beauty-makeup", parentID: "340e54af-8011-47b5-b175-aaf0f9609bd9", parentSlug: "beauty", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/292/1200/800"},
		{id: "eb730e6d-558f-4dd1-96e1-dfff15068745", name: "Haircare", slug: "beauty-haircare", parentID: "340e54af-8011-47b5-b175-aaf0f9609bd9", parentSlug: "beauty", visibility: "public", noindex: false, imageURL: "https://picsum.photos/id/367/1200/800"},
	}
}

func buildCategoryRows(categories []categoryRow) [][]string {
	headers := []string{"id", "name", "slug", "description", "visibility", "parent_id", "parent_slug", "meta_title", "meta_description", "canonical_url", "noindex", "image_url"}
	rows := [][]string{headers}
	lookup := map[string]string{}
	for _, category := range categories {
		lookup[category.id] = category.slug
	}

	for _, category := range categories {
		rows = append(rows, []string{
			category.id,
			category.name,
			category.slug,
			fmt.Sprintf("Category %s used for bulk import testing.", category.name),
			category.visibility,
			category.parentID,
			firstNonEmpty(category.parentSlug, lookup[category.parentID]),
			fmt.Sprintf("Buy %s online", category.name),
			fmt.Sprintf("Explore the %s category for bulk import validation.", category.name),
			fmt.Sprintf("https://example.com/categories/%s", category.slug),
			boolString(category.noindex),
			category.imageURL,
		})
	}
	return rows
}

func buildProductRows(categories []categoryRow) [][]string {
	headers := []string{"id", "title", "slug", "description", "status", "visibility", "price", "sale_price", "currency", "sku", "track_stock", "stock", "low_stock_threshold", "weight", "dimensions", "brand", "tax_class", "category_id", "category_slug", "category_name", "published_at", "image_url", "image_urls", "meta_title", "meta_description", "canonical_url", "noindex"}
	rows := [][]string{headers}
	publishedAt := time.Date(2026, 4, 1, 10, 0, 0, 0, time.UTC).Format(time.RFC3339)
	brands := []string{"Atlas", "Nova", "Luma", "Vertex", "Bloom"}
	bySlug := map[string]categoryRow{}
	for _, category := range categories {
		bySlug[category.slug] = category
	}
	leafOrder := []string{
		"home-kitchen", "home-decor", "home-storage",
		"electronics-audio", "electronics-mobile", "electronics-gaming",
		"sports-fitness", "sports-outdoor", "sports-running",
		"kids-baby", "kids-toys", "kids-school",
		"fashion-women", "fashion-men", "fashion-accessories",
		"beauty-skincare", "beauty-makeup", "beauty-haircare",
	}
	leafCategories := make([]categoryRow, 0, len(leafOrder))
	for _, slug := range leafOrder {
		leafCategories = append(leafCategories, bySlug[slug])
	}
	imageSets := map[string]productImageSet{
		"home-kitchen":        {primary: "https://picsum.photos/id/292/800/800", others: []string{"https://picsum.photos/id/133/800/800", "https://picsum.photos/id/180/800/800"}},
		"home-decor":          {primary: "https://picsum.photos/id/133/800/800", others: []string{"https://picsum.photos/id/180/800/800", "https://picsum.photos/id/292/800/800"}},
		"home-storage":        {primary: "https://picsum.photos/id/180/800/800", others: []string{"https://picsum.photos/id/292/800/800", "https://picsum.photos/id/133/800/800"}},
		"electronics-audio":   {primary: "https://picsum.photos/id/367/800/800", others: []string{"https://picsum.photos/id/106/800/800", "https://picsum.photos/id/1015/800/800"}},
		"electronics-mobile":  {primary: "https://picsum.photos/id/1015/800/800", others: []string{"https://picsum.photos/id/367/800/800", "https://picsum.photos/id/106/800/800"}},
		"electronics-gaming":  {primary: "https://picsum.photos/id/106/800/800", others: []string{"https://picsum.photos/id/1015/800/800", "https://picsum.photos/id/367/800/800"}},
		"sports-fitness":      {primary: "https://picsum.photos/id/201/800/800", others: []string{"https://picsum.photos/id/133/800/800", "https://picsum.photos/id/180/800/800"}},
		"sports-outdoor":      {primary: "https://picsum.photos/id/133/800/800", others: []string{"https://picsum.photos/id/180/800/800", "https://picsum.photos/id/201/800/800"}},
		"sports-running":      {primary: "https://picsum.photos/id/180/800/800", others: []string{"https://picsum.photos/id/201/800/800", "https://picsum.photos/id/133/800/800"}},
		"kids-baby":           {primary: "https://picsum.photos/id/292/800/800", others: []string{"https://picsum.photos/id/1015/800/800", "https://picsum.photos/id/106/800/800"}},
		"kids-toys":           {primary: "https://picsum.photos/id/1015/800/800", others: []string{"https://picsum.photos/id/106/800/800", "https://picsum.photos/id/292/800/800"}},
		"kids-school":         {primary: "https://picsum.photos/id/106/800/800", others: []string{"https://picsum.photos/id/292/800/800", "https://picsum.photos/id/1015/800/800"}},
		"fashion-women":       {primary: "https://picsum.photos/id/1011/800/800", others: []string{"https://picsum.photos/id/201/800/800", "https://picsum.photos/id/133/800/800"}},
		"fashion-men":         {primary: "https://picsum.photos/id/201/800/800", others: []string{"https://picsum.photos/id/133/800/800", "https://picsum.photos/id/1011/800/800"}},
		"fashion-accessories": {primary: "https://picsum.photos/id/133/800/800", others: []string{"https://picsum.photos/id/180/800/800", "https://picsum.photos/id/292/800/800"}},
		"beauty-skincare":     {primary: "https://picsum.photos/id/1060/800/800", others: []string{"https://picsum.photos/id/292/800/800", "https://picsum.photos/id/367/800/800"}},
		"beauty-makeup":       {primary: "https://picsum.photos/id/292/800/800", others: []string{"https://picsum.photos/id/1060/800/800", "https://picsum.photos/id/367/800/800"}},
		"beauty-haircare":     {primary: "https://picsum.photos/id/367/800/800", others: []string{"https://picsum.photos/id/1060/800/800", "https://picsum.photos/id/292/800/800"}},
	}

	for index := 1; index <= 120; index++ {
		category := leafCategories[(index-1)%len(leafCategories)]
		imageSet := imageSets[category.slug]
		price := 19.99 + float64(index%15)*5.5
		salePrice := ""
		if index%4 == 0 {
			salePrice = fmt.Sprintf("%.2f", price-3.0)
		}
		status := "published"
		if index%10 == 0 {
			status = "draft"
		}
		visibility := "public"
		if index%13 == 0 {
			visibility = "private"
		}
		title := fmt.Sprintf("Test Product %03d", index)
		slug := fmt.Sprintf("test-product-%03d", index)
		rows = append(rows, []string{
			"",
			title,
			slug,
			fmt.Sprintf("Demo product %03d for validating bulk product import.", index),
			status,
			visibility,
			fmt.Sprintf("%.2f", price),
			salePrice,
			"EUR",
			fmt.Sprintf("SKU-%03d", index),
			boolString(index%3 != 0),
			strconv.Itoa(10 + index%40),
			strconv.Itoa(3 + index%5),
			fmt.Sprintf("%.2f", 0.25+float64(index%8)*0.15),
			fmt.Sprintf("%dx%dx%d cm", 10+index%4, 20+index%5, 5+index%3),
			brands[index%len(brands)],
			"standard",
			category.id,
			category.slug,
			category.name,
			publishedAt,
			imageSet.primary,
			strings.Join(imageSet.others, "|"),
			fmt.Sprintf("%s | %s", title, category.name),
			fmt.Sprintf("SEO description for %s in %s.", title, category.name),
			fmt.Sprintf("https://example.com/products/%s", slug),
			boolString(index%17 == 0),
		})
	}

	return rows
}

func buildCollectionRows() [][]string {
	headers := []string{"id", "name", "slug", "type", "rule", "description", "meta_title", "meta_description", "canonical_url", "noindex", "image_url"}
	rows := [][]string{headers}
	collections := []collectionRow{
		{id: "5f5348c4-8d7c-451c-abef-479e550a5262", name: "New Arrivals", slug: "new-arrivals", kind: "manual", noindex: true, imageURL: "https://picsum.photos/id/1015/1200/800"},
		{id: "b55c0adc-5a3a-4c0c-8cc3-6c0084bd85e3", name: "Best Sellers", slug: "best-sellers", kind: "manual", noindex: false, imageURL: "https://picsum.photos/id/106/1200/800"},
		{id: "f546178c-fbfc-4f6f-8745-dd90fb66f64d", name: "Gift Ideas", slug: "gift-ideas", kind: "manual", noindex: false, imageURL: "https://picsum.photos/id/201/1200/800"},
		{id: "932ab886-91b0-438e-a0dc-5bc90fc3d47f", name: "Editors Picks", slug: "editors-picks", kind: "manual", noindex: false, imageURL: "https://picsum.photos/id/133/1200/800"},
		{id: "ddbed4e5-ad3e-4c4d-a9a3-53fb59b09548", name: "Weekend Deals", slug: "weekend-deals", kind: "manual", noindex: false, imageURL: "https://picsum.photos/id/180/1200/800"},
		{id: "1239252e-d13c-4e79-bd07-e6b419828b23", name: "Office Favorites", slug: "office-favorites", kind: "manual", noindex: true, imageURL: "https://picsum.photos/id/367/1200/800"},
		{id: "c5d6fb57-3078-4af0-9a1f-d1298913b546", name: "Premium Picks", slug: "premium-picks", kind: "automatic", rule: "price >= 60", noindex: true, imageURL: "https://picsum.photos/id/1060/1200/800"},
		{id: "7da29dbb-5d29-4544-9303-c32405c9f954", name: "In Stock Essentials", slug: "in-stock-essentials", kind: "automatic", rule: "stock > 20", noindex: false, imageURL: "https://picsum.photos/id/292/1200/800"},
		{id: "63cb6199-4157-48ae-b243-1f89f4827798", name: "Visible Catalog", slug: "visible-catalog", kind: "automatic", rule: "visibility = public", noindex: false, imageURL: "https://picsum.photos/id/133/1200/800"},
		{id: "a153380f-724f-43ea-ad0a-305c62cadc4c", name: "Published Offers", slug: "published-offers", kind: "automatic", rule: "status = published", noindex: true, imageURL: "https://picsum.photos/id/201/1200/800"},
		{id: "453612f7-c181-4c95-aa13-515efdbd4b2e", name: "Atlas Brand", slug: "atlas-brand", kind: "automatic", rule: "brand = Atlas", noindex: false, imageURL: "https://picsum.photos/id/367/1200/800"},
	}
	for _, collection := range collections {
		rows = append(rows, []string{
			collection.id,
			collection.name,
			collection.slug,
			collection.kind,
			collection.rule,
			fmt.Sprintf("%s collection %s for import testing.", strings.Title(collection.kind), collection.name),
			fmt.Sprintf("%s Collection", collection.name),
			fmt.Sprintf("Browse %s products.", collection.name),
			fmt.Sprintf("https://example.com/collections/%s", collection.slug),
			boolString(collection.noindex),
			collection.imageURL,
		})
	}
	return rows
}

func buildTagRows() [][]string {
	headers := []string{"id", "name", "slug", "color"}
	rows := [][]string{headers}
	colors := []string{"#2563EB", "#DC2626", "#059669", "#7C3AED", "#D97706", "#0F766E"}
	tags := []string{
		"New", "Sale", "Limited", "Organic", "Eco", "Premium", "Giftable", "Trending", "Summer", "Winter",
		"Minimal", "Classic", "Luxury", "Sport", "Travel", "Office", "Kids", "Women", "Men", "Home",
		"Tech", "Beauty", "Wellness", "Outdoor", "Exclusive", "Editor Choice", "Popular", "Bundle", "Fresh", "Vegan",
	}
	for index, name := range tags {
		rows = append(rows, []string{
			uuid.NewString(),
			name,
			slugify(name),
			colors[index%len(colors)],
		})
	}
	return rows
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(" ", "-", "/", "-", "_", "-", "'", "", "&", "and")
	value = replacer.Replace(value)
	for strings.Contains(value, "--") {
		value = strings.ReplaceAll(value, "--", "-")
	}
	return strings.Trim(value, "-")
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
