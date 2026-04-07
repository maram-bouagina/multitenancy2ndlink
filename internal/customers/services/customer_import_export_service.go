package services

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"mime/multipart"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
	excelize "github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"multitenancypfe/internal/customers/models"
	productservices "multitenancypfe/internal/products/services"
)

type ImportResult struct {
	Imported int      `json:"imported"`
	Updated  int      `json:"updated"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

var customerHeaders = []string{
	"id", "email", "first_name", "last_name", "phone", "status", "email_verified", "accepts_marketing",
}

var customerGroupHeaders = []string{
	"id", "name", "description", "discount", "member_emails",
}

func ExportCustomersCSV(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	customers, err := listCustomersForExport(db, storeID)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(customerHeaders)
	for _, customer := range customers {
		_ = w.Write(customerToRow(customer))
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

func ExportCustomersXLSX(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	customers, err := listCustomersForExport(db, storeID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Customers"
	f.SetSheetName("Sheet1", sheet)
	for col, header := range customerHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, header)
	}
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	lastHeaderCell, _ := excelize.CoordinatesToCellName(len(customerHeaders), 1)
	_ = f.SetCellStyle(sheet, "A1", lastHeaderCell, boldStyle)

	for rowIdx, customer := range customers {
		row := customerToRow(customer)
		for col, value := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			_ = f.SetCellValue(sheet, cell, value)
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func ImportCustomersFromFile(db *gorm.DB, storeID uuid.UUID, fh *multipart.FileHeader) (*ImportResult, error) {
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	rows, err := parseRowsFromFile(fh.Filename, f)
	if err != nil {
		return nil, err
	}
	return applyCustomerRows(db, storeID, rows)
}

func ExportCustomerGroupsCSV(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	rows, err := customerGroupsToRows(db, storeID)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(customerGroupHeaders)
	for _, row := range rows {
		_ = w.Write(row)
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

func ExportCustomerGroupsXLSX(db *gorm.DB, storeID uuid.UUID) ([]byte, error) {
	rows, err := customerGroupsToRows(db, storeID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Customer Groups"
	f.SetSheetName("Sheet1", sheet)
	for col, header := range customerGroupHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, header)
	}
	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	lastHeaderCell, _ := excelize.CoordinatesToCellName(len(customerGroupHeaders), 1)
	_ = f.SetCellStyle(sheet, "A1", lastHeaderCell, boldStyle)

	for rowIdx, row := range rows {
		for col, value := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			_ = f.SetCellValue(sheet, cell, value)
		}
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func ImportCustomerGroupsFromFile(db *gorm.DB, storeID uuid.UUID, fh *multipart.FileHeader) (*ImportResult, error) {
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	rows, err := parseRowsFromFile(fh.Filename, f)
	if err != nil {
		return nil, err
	}
	return applyCustomerGroupRows(db, storeID, rows)
}

func parseRowsFromFile(filename string, file multipart.File) ([][]string, error) {
	ext := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(ext, ".csv"):
		return productservices.ParseCSV(file)
	case strings.HasSuffix(ext, ".xlsx"):
		return productservices.ParseXLSX(file)
	default:
		return nil, errors.New("unsupported file format: use .csv or .xlsx")
	}
}

func listCustomersForExport(db *gorm.DB, storeID uuid.UUID) ([]models.Customer, error) {
	var customers []models.Customer
	err := db.Where("store_id = ?", storeID).Order("created_at DESC").Find(&customers).Error
	return customers, err
}

func customerToRow(customer models.Customer) []string {
	row := make([]string, len(customerHeaders))
	row[0] = customer.ID
	row[1] = customer.Email
	row[2] = customer.FirstName
	row[3] = customer.LastName
	if customer.Phone != nil {
		row[4] = *customer.Phone
	}
	row[5] = customer.Status
	row[6] = strconv.FormatBool(customer.EmailVerified)
	row[7] = strconv.FormatBool(customer.AcceptsMarketing)
	return row
}

func applyCustomerRows(db *gorm.DB, storeID uuid.UUID, rows [][]string) (*ImportResult, error) {
	if len(rows) < 2 {
		return &ImportResult{}, nil
	}

	idx := map[string]int{}
	for i, header := range rows[0] {
		idx[strings.TrimSpace(strings.ToLower(header))] = i
	}
	get := func(row []string, key string) string {
		i, ok := idx[key]
		if !ok || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}

	result := &ImportResult{}
	for lineNo, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}
		lineNum := lineNo + 2

		email := strings.ToLower(get(row, "email"))
		if email == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: email is required", lineNum))
			result.Skipped++
			continue
		}

		firstName := get(row, "first_name")
		lastName := get(row, "last_name")
		if firstName == "" || lastName == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: first_name and last_name are required", lineNum))
			result.Skipped++
			continue
		}

		status := normalizeCustomerStatus(get(row, "status"))
		if status == "" {
			status = "pending"
		}

		emailVerified, err := parseOptionalBool(get(row, "email_verified"), false)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: invalid email_verified value", lineNum))
			result.Skipped++
			continue
		}

		acceptsMarketing, err := parseOptionalBool(get(row, "accepts_marketing"), false)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: invalid accepts_marketing value", lineNum))
			result.Skipped++
			continue
		}

		var phone *string
		if value := get(row, "phone"); value != "" {
			phone = &value
		}

		var customer models.Customer
		err = db.Where("store_id = ? AND email = ?", storeID, email).First(&customer).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't read this customer. Please try again.", lineNum))
			result.Skipped++
			continue
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			customerID := get(row, "id")
			if customerID == "" {
				customerID = uuid.NewString()
			}
			customer = models.Customer{
				ID:               customerID,
				StoreID:          storeID,
				Email:            email,
				FirstName:        firstName,
				LastName:         lastName,
				Phone:            phone,
				Status:           status,
				EmailVerified:    emailVerified,
				AcceptsMarketing: acceptsMarketing,
			}
			if err := db.Create(&customer).Error; err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't save this customer. Please check the file and try again.", lineNum))
				result.Skipped++
				continue
			}
			result.Imported++
			continue
		}

		customer.FirstName = firstName
		customer.LastName = lastName
		customer.Phone = phone
		customer.Status = status
		customer.EmailVerified = emailVerified
		customer.AcceptsMarketing = acceptsMarketing
		if err := db.Save(&customer).Error; err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't update this customer. Please try again.", lineNum))
			result.Skipped++
			continue
		}
		result.Updated++
	}

	return result, nil
}

func customerGroupsToRows(db *gorm.DB, storeID uuid.UUID) ([][]string, error) {
	var groups []models.CustomerGroup
	if err := db.Where("store_id = ?", storeID).Order("name ASC").Find(&groups).Error; err != nil {
		return nil, err
	}

	rows := make([][]string, 0, len(groups))
	for _, group := range groups {
		memberEmails, err := listGroupMemberEmails(db, group.ID)
		if err != nil {
			return nil, err
		}
		row := []string{
			group.ID.String(),
			group.Name,
			stringPtrValue(group.Description),
			strconv.FormatFloat(group.Discount, 'f', 2, 64),
			strings.Join(memberEmails, ", "),
		}
		rows = append(rows, row)
	}
	return rows, nil
}

func applyCustomerGroupRows(db *gorm.DB, storeID uuid.UUID, rows [][]string) (*ImportResult, error) {
	if len(rows) < 2 {
		return &ImportResult{}, nil
	}

	idx := map[string]int{}
	for i, header := range rows[0] {
		idx[strings.TrimSpace(strings.ToLower(header))] = i
	}
	get := func(row []string, key string) string {
		i, ok := idx[key]
		if !ok || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}

	result := &ImportResult{}
	for lineNo, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}
		lineNum := lineNo + 2

		name := get(row, "name")
		if name == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: name is required", lineNum))
			result.Skipped++
			continue
		}

		discount, err := parseOptionalFloat(get(row, "discount"), 0)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: invalid discount value", lineNum))
			result.Skipped++
			continue
		}

		var description *string
		if value := get(row, "description"); value != "" {
			description = &value
		}

		group, err := findCustomerGroupForImport(db, storeID, get(row, "id"), name)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't read this customer group. Please try again.", lineNum))
			result.Skipped++
			continue
		}

		created := false
		if group == nil {
			group = &models.CustomerGroup{StoreID: storeID}
			created = true
		}

		group.Name = name
		group.Description = description
		group.Discount = discount

		if created {
			if err := db.Create(group).Error; err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't save this customer group. Please try again.", lineNum))
				result.Skipped++
				continue
			}
			result.Imported++
		} else {
			if err := db.Save(group).Error; err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't update this customer group. Please try again.", lineNum))
				result.Skipped++
				continue
			}
			result.Updated++
		}

		if _, ok := idx["member_emails"]; ok {
			warnings, err := syncCustomerGroupMembers(db, storeID, group.ID, get(row, "member_emails"))
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: we couldn't update the group members. Please try again.", lineNum))
				result.Skipped++
				continue
			}
			result.Warnings = append(result.Warnings, warnings...)
		}
	}

	return result, nil
}

func findCustomerGroupForImport(db *gorm.DB, storeID uuid.UUID, idValue string, name string) (*models.CustomerGroup, error) {
	if idValue != "" {
		if groupID, err := uuid.Parse(idValue); err == nil {
			var group models.CustomerGroup
			err = db.Where("store_id = ? AND id = ?", storeID, groupID).First(&group).Error
			if err == nil {
				return &group, nil
			}
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, err
			}
		}
	}

	var group models.CustomerGroup
	err := db.Where("store_id = ? AND name = ?", storeID, name).First(&group).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &group, nil
}

func listGroupMemberEmails(db *gorm.DB, groupID uuid.UUID) ([]string, error) {
	var emails []string
	err := db.Table("clients").
		Joins("JOIN customer_group_members ON customer_group_members.customer_id = clients.id").
		Where("customer_group_members.customer_group_id = ?", groupID).
		Order("clients.email ASC").
		Pluck("clients.email", &emails).Error
	return emails, err
}

func syncCustomerGroupMembers(db *gorm.DB, storeID uuid.UUID, groupID uuid.UUID, rawEmails string) ([]string, error) {
	emails := splitEmails(rawEmails)
	currentMembers := make([]models.CustomerGroupMember, 0)
	if err := db.Where("customer_group_id = ?", groupID).Find(&currentMembers).Error; err != nil {
		return nil, err
	}

	currentByCustomerID := make(map[string]struct{}, len(currentMembers))
	for _, member := range currentMembers {
		currentByCustomerID[member.CustomerID] = struct{}{}
	}

	desiredCustomerIDs := make([]string, 0, len(emails))
	warnings := make([]string, 0)
	for _, email := range emails {
		var customer models.Customer
		err := db.Where("store_id = ? AND email = ?", storeID, email).First(&customer).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			warnings = append(warnings, fmt.Sprintf("customer email '%s' was not found and was skipped from group membership", email))
			continue
		}
		if err != nil {
			return nil, err
		}
		desiredCustomerIDs = append(desiredCustomerIDs, customer.ID)
	}

	desiredSet := make(map[string]struct{}, len(desiredCustomerIDs))
	for _, customerID := range desiredCustomerIDs {
		desiredSet[customerID] = struct{}{}
		if _, ok := currentByCustomerID[customerID]; ok {
			continue
		}
		member := models.CustomerGroupMember{CustomerGroupID: groupID, CustomerID: customerID}
		if err := db.Create(&member).Error; err != nil {
			return nil, err
		}
	}

	for _, member := range currentMembers {
		if _, ok := desiredSet[member.CustomerID]; ok {
			continue
		}
		if err := db.Where("customer_group_id = ? AND customer_id = ?", groupID, member.CustomerID).Delete(&models.CustomerGroupMember{}).Error; err != nil {
			return nil, err
		}
	}

	return warnings, nil
}

func normalizeCustomerStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "active", "pending", "suspended":
		return strings.ToLower(strings.TrimSpace(value))
	case "":
		return ""
	default:
		return "pending"
	}
}

func parseOptionalBool(value string, defaultValue bool) (bool, error) {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return defaultValue, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, err
	}
	return parsed, nil
}

func parseOptionalFloat(value string, defaultValue float64) (float64, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return defaultValue, nil
	}
	return strconv.ParseFloat(value, 64)
}

func splitEmails(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';' || r == '\n'
	})
	result := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		email := strings.ToLower(strings.TrimSpace(part))
		if email == "" {
			continue
		}
		if _, ok := seen[email]; ok {
			continue
		}
		seen[email] = struct{}{}
		result = append(result, email)
	}
	sort.Strings(result)
	return result
}

func stringPtrValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
