terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

# ── Provider ──────────────────────────────────────────────────────────────────
# Authenticates with your Grafana Cloud stack.
# Get your service account token from:
#   Grafana Cloud → Administration → Service accounts → Add service account token
# The account needs the "Editor" role to create synthetic monitoring checks.
provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_service_account_token
}

# ── Variables ─────────────────────────────────────────────────────────────────
variable "grafana_url" {
  description = "Your Grafana Cloud stack URL, e.g. https://yourteam.grafana.net"
  type        = string
}

variable "grafana_service_account_token" {
  description = "Grafana service account token with Editor role"
  type        = string
  sensitive   = true
}

variable "site_url" {
  description = "Production site URL, e.g. https://your-site.vercel.app"
  type        = string
}

# ── Probe location ────────────────────────────────────────────────────────────
# probes is map(number): { "London" = 1, "Frankfurt" = 2, ... }
data "grafana_synthetic_monitoring_probes" "main" {}

locals {
  # Find the London probe ID; fall back to the first available probe.
  london_probe_id = try(
    data.grafana_synthetic_monitoring_probes.main.probes["London"],
    values(data.grafana_synthetic_monitoring_probes.main.probes)[0]
  )
}

# ── Synthetic monitoring checks ───────────────────────────────────────────────
# alert_sensitivity controls when Grafana fires alerts:
#   "none" = no alerts, "low" = tolerant, "medium" = default, "high" = strict

resource "grafana_synthetic_monitoring_check" "homepage" {
  job               = "homepage"
  target            = "${var.site_url}/"
  enabled           = true
  probes            = [local.london_probe_id]
  labels            = { environment = "production" }
  frequency         = 60000  # ms — 1 minute
  timeout           = 10000  # ms — 10 seconds
  alert_sensitivity = "medium"

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      valid_status_codes  = [200]
    }
  }
}

resource "grafana_synthetic_monitoring_check" "login_page" {
  job               = "login-page"
  target            = "${var.site_url}/login"
  enabled           = true
  probes            = [local.london_probe_id]
  labels            = { environment = "production" }
  frequency         = 60000
  timeout           = 10000
  alert_sensitivity = "medium"

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      valid_status_codes  = [200]
    }
  }
}

resource "grafana_synthetic_monitoring_check" "health_api" {
  job               = "health-api"
  target            = "${var.site_url}/api/health"
  enabled           = true
  probes            = [local.london_probe_id]
  labels            = { environment = "production" }
  frequency         = 60000
  timeout           = 10000
  alert_sensitivity = "medium"

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      valid_status_codes  = [200]
    }
  }
}
