package services

import (
	"bytes"
	"fmt"
	"net/smtp"
	"os"
	"strconv"
	"text/template"
)

type EmailService interface {
	SendInvitationEmail(email, inviterName, storeName, token string) error
}

type emailService struct {
	appURL string
	// SMTP config — read from env at startup
	host     string
	port     int
	username string
	password string
	from     string
}

func NewEmailService() EmailService {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}
	port := 587
	if p, err := strconv.Atoi(os.Getenv("SMTP_PORT")); err == nil && p > 0 {
		port = p
	}
	return &emailService{
		appURL:   appURL,
		host:     os.Getenv("SMTP_HOST"),
		port:     port,
		username: os.Getenv("SMTP_USER"),
		password: os.Getenv("SMTP_PASS"),
		from:     os.Getenv("SMTP_FROM"),
	}
}

const inviteHTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#f9fafb;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;
             border-radius:8px;border:1px solid #e5e7eb;padding:40px 32px">
        <tr><td>
          <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#111827">
            You&apos;ve been invited!
          </p>
          <p style="margin:0 0 16px;color:#374151;line-height:1.6">
            <strong>{{.InviterName}}</strong> has invited you to collaborate on their store
            <strong>{{.StoreName}}</strong>.
          </p>
          <p style="margin:0 0 32px;color:#374151">
            Click the button below to create your account and accept the invitation.
            The link expires in <strong>7 days</strong>.
          </p>
          <a href="{{.InvitationLink}}"
             style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;
                    padding:12px 24px;border-radius:6px;text-decoration:none;font-size:15px">
            Accept Invitation
          </a>
          <p style="margin:32px 0 0;color:#9ca3af;font-size:12px">
            Or copy this link: {{.InvitationLink}}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

func (s *emailService) SendInvitationEmail(email, inviterName, storeName, token string) error {
	// The invite page lives at /dashboard/invite/<token>
	invitationLink := fmt.Sprintf("%s/dashboard/invite/%s", s.appURL, token)

	// Render HTML body
	tmpl, err := template.New("invite").Parse(inviteHTML)
	if err != nil {
		return fmt.Errorf("email template error: %w", err)
	}
	var body bytes.Buffer
	if err := tmpl.Execute(&body, map[string]string{
		"InviterName":    inviterName,
		"StoreName":      storeName,
		"InvitationLink": invitationLink,
	}); err != nil {
		return fmt.Errorf("email render error: %w", err)
	}

	// If SMTP is not configured, fall back to console (dev mode)
	if s.host == "" || s.username == "" {
		fmt.Printf("\n[DEV] Invitation email for %s\nLink: %s\n\n", email, invitationLink)
		return nil
	}

	from := s.from
	if from == "" {
		from = s.username
	}

	subject := fmt.Sprintf("You've been invited to join %s", storeName)
	msg := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"From: " + from + "\r\n" +
		"To: " + email + "\r\n" +
		"Subject: " + subject + "\r\n\r\n" +
		body.String()

	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	if err := smtp.SendMail(addr, auth, from, []string{email}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send failed: %w", err)
	}
	return nil
}
