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
