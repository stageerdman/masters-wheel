use std::fmt;

// Every way a OneDrive call can fail. Display is the plain sentence the
// Settings panel shows the user; `context` wraps a lower-level message with
// where it happened, so a log line names the full path.
#[derive(Debug, Clone, PartialEq)]
pub enum OneDriveError {
    NotConfigured,
    NotConnected,
    SignInCancelled,
    SignInTimedOut,
    SignInExpired,
    // Another program holds the fixed sign-in redirect port.
    PortBusy(u16),
    // The account's organization doesn't allow this app (admin consent,
    // conditional access).
    OrgBlocked(String),
    Auth(String),
    Http(String),
    Graph { status: u16, message: String },
    Keychain(String),
    Internal(String),
}

impl OneDriveError {
    pub fn context(self, where_: &str) -> Self {
        match self {
            Self::Auth(m) => Self::Auth(format!("{where_}: {m}")),
            Self::Http(m) => Self::Http(format!("{where_}: {m}")),
            Self::Graph { status, message } => Self::Graph { status, message: format!("{where_}: {message}") },
            Self::Keychain(m) => Self::Keychain(format!("{where_}: {m}")),
            Self::Internal(m) => Self::Internal(format!("{where_}: {m}")),
            other => other,
        }
    }

    // A Microsoft sign-in error, told apart by its AADSTS code.
    pub fn from_microsoft(description: &str) -> Self {
        const ORG_BLOCKS: [&str; 5] = ["AADSTS65001", "AADSTS90094", "AADSTS90095", "AADSTS50105", "AADSTS53003"];
        if ORG_BLOCKS.iter().any(|code| description.contains(code)) {
            Self::OrgBlocked(description.to_string())
        } else {
            Self::Auth(description.to_string())
        }
    }

    // What the Settings panel needs to pick its line (SPEC 5.3).
    pub fn kind(&self) -> &'static str {
        match self {
            Self::NotConfigured => "notConfigured",
            Self::SignInCancelled => "cancelled",
            Self::OrgBlocked(_) => "orgBlocked",
            Self::PortBusy(_) => "portBusy",
            Self::Http(_) => "offline",
            _ => "other",
        }
    }
}

// How a command error reaches the webview: a kind to branch on and the
// full message for the log.
#[derive(Debug, Clone, serde::Serialize)]
pub struct CommandError {
    pub kind: &'static str,
    pub message: String,
}

impl From<OneDriveError> for CommandError {
    fn from(error: OneDriveError) -> Self {
        Self { kind: error.kind(), message: error.to_string() }
    }
}

impl fmt::Display for OneDriveError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotConfigured => write!(
                f,
                "OneDrive isn't set up in this build yet (ONEDRIVE_CLIENT_ID is missing). See the ONEDRIVE update's setup steps."
            ),
            Self::NotConnected => write!(f, "OneDrive isn't connected."),
            Self::SignInCancelled => write!(f, "Sign-in was cancelled."),
            Self::SignInTimedOut => write!(f, "Sign-in took too long, so it was stopped. Try again."),
            Self::SignInExpired => write!(f, "Your OneDrive sign-in expired. Connect again."),
            Self::PortBusy(port) => write!(
                f,
                "Another program is using port {port}, which Microsoft sign-in needs. Close it, then try again."
            ),
            Self::OrgBlocked(m) => write!(f, "Your organization doesn't allow this app ({m})."),
            Self::Auth(m) => write!(f, "Microsoft sign-in failed ({m})."),
            Self::Http(m) => write!(f, "Couldn't reach Microsoft ({m})."),
            Self::Graph { status, message } => write!(f, "OneDrive returned an error ({status}: {message})."),
            Self::Keychain(m) => write!(f, "Couldn't use the macOS Keychain ({m})."),
            Self::Internal(m) => write!(f, "Something went wrong ({m})."),
        }
    }
}

impl From<OneDriveError> for String {
    fn from(error: OneDriveError) -> Self {
        error.to_string()
    }
}
