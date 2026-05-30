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
# List available probes: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/references/probe-reference/
data "grafana_synthetic_monitoring_probes" "main" {}

locals {
  # Use London probe (EU-West). Falls back to first available probe if not found.
  london_probe_id = try(
    [for p in data.grafana_synthetic_monitoring_probes.main.probes : p if can(regex("(?i)london|eu-west", p))][0],
    values(data.grafana_synthetic_monitoring_probes.main.probes)[0]
  )
}

# ── Synthetic monitoring checks ───────────────────────────────────────────────

resource "grafana_synthetic_monitoring_check" "homepage" {
  job     = "homepage"
  target  = "${var.site_url}/"
  enabled = true
  probes  = [local.london_probe_id]
  labels  = { environment = "production" }

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      valid_status_codes  = [200]
    }
  }

  frequency = 60000  # milliseconds — 1 minute
  timeout   = 10000  # milliseconds — 10 seconds

  alerts {
    enabled                = true
    period                 = "2m"
    evaluation_interval    = "1m"
  }
}

resource "grafana_synthetic_monitoring_check" "login_page" {
  job     = "login-page"
  target  = "${var.site_url}/login"
  enabled = true
  probes  = [local.london_probe_id]
  labels  = { environment = "production" }

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      valid_status_codes  = [200]
    }
  }

  frequency = 60000
  timeout   = 10000

  alerts {
    enabled                = true
    period                 = "2m"
    evaluation_interval    = "1m"
  }
}

resource "grafana_synthetic_monitoring_check" "health_api" {
  job     = "health-api"
  target  = "${var.site_url}/api/health"
  enabled = true
  probes  = [local.london_probe_id]
  labels  = { environment = "production" }

  settings {
    http {
      ip_version          = "V4"
      method              = "GET"
      no_follow_redirects = false
      valid_status_codes  = [200]
    }
  }

  frequency = 60000
  timeout   = 10000

  alerts {
    enabled                = true
    period                 = "2m"
    evaluation_interval    = "1m"
  }
}
