# Vasundhara Infra CRM - Client Handoff & Operations Guide

Welcome to your new enterprise-ready Custom CRM platform. This document serves as the official operations, security, and administrative handoff guide.

---

## 🚀 Critical Access Information

> [!WARNING]
> **Domain Migration Notice**: The application is officially live and must be accessed via your custom domain:
> **`https://crm.vasundharainfra.com`**
>
> The temporary developer domain (Vercel) will be **deprecated and shut down in 2 days**. Please ensure all employees and administrators switch to the official domain immediately to avoid losing access.

---

## 👥 Stakeholder Guidelines & Instructions

### 1. For Employees (Sales Agents / Staff)
* **First-Time Access**: Go to [crm.vasundharainfra.com/signup](https://crm.vasundharainfra.com/signup), register your account, and select your department.
* **Approval Process**: Your account will be locked in a "pending approval" state. You will not see any data until an administrator manually approves your account.
* **Core Actions**: Add client leads, update lead statuses, and schedule follow-ups. Ensure every client has a designated "next follow-up date."
* **Best Practice (Monthly Backup)**: At the end of every month, export your assigned leads to a CSV spreadsheet using the **Export CSV** button on your dashboard. Save this file to a secure company folder (e.g., Google Drive) as a secondary backup.

### 2. For Administrators (Managers)
* **Employee Management**: Go to the **Pending Approvals** tab to review and approve new employee registrations, or go to **Employees** to edit profiles or delete accounts.
* **Lead Supervision**: Assign new leads or reassign orphaned leads when an employee leaves or changes roles.
* **Audit Trail**: Regularly check the **Audit Logs** to view a read-only, tamper-proof history of all database modifications (who deleted a client, who modified status, etc.).
* **Best Practice (Monthly Backup)**: At the end of every month, export the **entire company database** of leads to CSV via the Admin Dashboard. Archive this securely.

### 3. For the Super Administrator (Owner)
* **Access Level**: The Super Admin holds root ownership. Only the Super Admin can promote employees to Admins or transfer ownership of the entire CRM platform.

---

## 🔒 Security & Cost-Guard Measures

To protect the business from high cloud bills, the platform has been secured with the following technical safeguards:

1. **Authentication Lock**: Nobody from the public internet can read or write to the database. All requests are blocked unless the user is logged in and manually approved by you or your managers.
2. **Infinite Loop Guard (The Bouncer)**: If an employee's browser encounters a technical glitch or runs an automatic script that attempts to query the database repeatedly, the system will instantly detect the spike, block the queries locally, and show an alert. This stops runaway charges in seconds.
3. **Server Scaling Cap**: Server resources are locked to a maximum of 10 concurrent instances to prevent unexpected hosting bills.
4. **GCP Budget Email Alerts**: We have configured automatic email notifications directly in Google Cloud. If monthly billing reaches ₹100, ₹250, or ₹500, Google will instantly email you so you can review usage.

---

## 📂 Monthly Backup Routine (Step-by-Step)

To guarantee database safety, it is highly recommended to perform a manual backup on the last day of every month:

1. Log in to the CRM as an **Admin** or **Super Admin**.
2. Navigate to the **Clients / Leads** directory.
3. Click the **Download CSV / Export** button at the top right of the data table.
4. Name the saved file using the format: `vasundhara_leads_backup_YYYY_MM.csv` (e.g., `vasundhara_leads_backup_2026_06.csv`).
5. Upload the file to your company's official secure cloud storage (Google Drive, Dropbox, or OneDrive) under a folder named `CRM Backups`.

---

## 🤝 Post-Handoff Support & Training

To ensure a smooth transition and operational success for your team, we are providing the following post-handoff support:

1. **Active Usage Monitoring**: We will monitor the platform's initial implementation and server health for **one month** to ensure everything works smoothly.
2. **Team Training Session**: Once the initial week of usage is complete, we can organize a **hands-on training session** for all your team members (sales agents and managers). This session will walk them through adding leads, scheduling follow-ups, and using the dashboards to make their daily tasks easier and more efficient.

---

## 🔑 Project Credentials Registry

*Note for Developer: Fill in the logins and secrets below before final handoff, then store this document in a secure location.*

| Service / Resource | Provider | Console Link | Username / Email | Password / Access Key |
| :--- | :--- | :--- | :--- | :--- |
| **GCP Cloud Console** | Google Cloud | [console.cloud.google.com](https://console.cloud.google.com) | `[Insert GCP Email]` | `[Insert Password]` |
| **Firebase Console** | Google Firebase | [console.firebase.google.com](https://console.firebase.google.com) | `[Insert Firebase Email]` | `[Insert Password]` |
| **Domain Registrar** | Hostinger/GoDaddy | `[Insert Registrar Link]` | `[Insert Username/Email]` | `[Insert Password]` |
| **DNS Management** | Cloudflare/Registrar | `[Insert DNS Console Link]` | `[Insert Account Email]` | `[Insert Password]` |
| **SMTP / Email API** | SendGrid/EmailJS | `[Insert Email API Link]` | `[Insert API Username]` | `[Insert Secret API Key]` |
| **Super Admin Login** | Custom CRM | [crm.vasundharainfra.com](https://crm.vasundharainfra.com) | `[Insert Super Admin Email]` | `[Insert Password]` |
