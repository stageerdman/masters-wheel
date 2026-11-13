// The MCP server the AI Assistant's agents talk to. Deliberately not a
// separate compiled binary — this app's own executable re-execs itself
// with MASTERS_WHEEL_MCP_SERVER set (see main.rs), which sidesteps every
// question of how a second bin target gets bundled/signed into the
// packaged .app: there's only ever one binary, already bundled, already
// wherever `std::env::current_exe()` says it is. Claude Code CLI spawns
// this as an ordinary stdio-transport MCP server subprocess per
// `assistant.rs`'s --mcp-config.
//
// One #[tool] method per tool in mcp/tools/ — see that module's own doc
// comment for the "add tool N+1" shape.

use rmcp::{
    ErrorData as McpError,
    ServerHandler,
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::{CallToolResult, ContentBlock, ServerCapabilities, ServerConfig},
    tool, tool_handler, tool_router,
    transport::stdio,
    ServiceExt,
};

use crate::mcp::bridge::ResourceKind;
use crate::mcp::permission;
use crate::mcp::tools::{
    get_performance_review, get_roleplay_transcript, get_training_session, list_performance_reviews,
    list_training_sessions, search_performance_reviews,
};

#[derive(Clone)]
pub struct MastersWheelServer {
    // Read by the #[tool_handler] macro's generated call_tool/list_tools
    // impl, which rustc's dead-code analysis can't see into — same
    // `#[allow(dead_code)]` workaround the upstream rmcp examples use for
    // this exact field.
    #[allow(dead_code)]
    tool_router: ToolRouter<MastersWheelServer>,
}

#[tool_router]
impl MastersWheelServer {
    fn new() -> Self {
        Self { tool_router: Self::tool_router() }
    }

    #[tool(
        description = "List every Performance Review record (a saved sales-call review session) the user has in Master's Wheel. Returns each record's id, title, date, status, and description only — never the real notes/transcript/question-analysis content. Always safe to call. The description field is real, user-written text about that call — for a qualitative/subjective question (e.g. \"which call was really tough for me personally\", \"find something I felt good about\"), read through every record's description yourself and judge which one(s) fit; don't assume you need a different tool for that. For a literal word/phrase that might appear inside a transcript rather than the description (e.g. \"temperature check\"), use search_performance_reviews instead. Use get_performance_review with a recordId from this list to actually read a specific record's content."
    )]
    async fn list_performance_reviews(&self) -> Result<CallToolResult, McpError> {
        let reviews = list_performance_reviews::list(&crate::mcp::paths::records_root());
        let json = serde_json::to_string_pretty(&reviews)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;
        Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
    }

    #[tool(
        description = "Search for a literal word or phrase across every Performance Review record's title, description, notes, transcript, and extracted question analysis — use this to find which call(s) a specific thing was said in (e.g. \"temperature check\", a product name, an objection). This is a plain case-insensitive substring match, not semantic/fuzzy search, so use the exact words likely to have been said, not a paraphrase. Always safe to call. Each result names which part matched (matched_in) and, if it matched inside notes/transcript/questions, a short snippet of the real content. For a qualitative/subjective question instead of a literal phrase, use list_performance_reviews and reason over its description field directly rather than searching for a phrase that may not literally appear anywhere."
    )]
    async fn search_performance_reviews(
        &self,
        Parameters(search_performance_reviews::SearchPerformanceReviewsInput { query, max_results }): Parameters<
            search_performance_reviews::SearchPerformanceReviewsInput,
        >,
    ) -> Result<CallToolResult, McpError> {
        let matches = search_performance_reviews::search(&crate::mcp::paths::records_root(), &query, max_results);
        let json = serde_json::to_string_pretty(&matches).map_err(|e| McpError::internal_error(e.to_string(), None))?;
        Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
    }

    #[tool(
        description = "Read a specific Performance Review record's real content (notes, transcript, and/or extracted question analysis — every question the salesperson asked on the call and the clean outcome of its answer) by its record_id from list_performance_reviews. Long text documents (notes/transcript) come back in chunks: if a returned document's has_more is true, call again with the same record_id/documents and offset = that document's offset + content.length to keep reading, repeating until has_more is false, before answering questions about its full content. questions always comes back whole (never chunked) as a list of {question, answer, timestamp_seconds} — it's absent (not an empty list) if nobody has generated it for this record yet. client_card (also whole, also absent until generated) is a summary of the prospect's situation: problem, avoiding, whyNow, ifNotResolved, whyNotYet, offered, nextStep."
    )]
    async fn get_performance_review(
        &self,
        Parameters(get_performance_review::GetPerformanceReviewInput { record_id, documents, offset, limit }): Parameters<
            get_performance_review::GetPerformanceReviewInput,
        >,
    ) -> Result<CallToolResult, McpError> {
        permission::mark_read(ResourceKind::PerformanceReview, &record_id).await;
        let content = get_performance_review::read(&record_id, &documents, offset, limit);
        let json = serde_json::to_string_pretty(&content).map_err(|e| McpError::internal_error(e.to_string(), None))?;
        Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
    }

    #[tool(
        description = "Read the roleplay transcript of the training session you're embedded in as the AI Trainer coach. Always safe to call, no permission needed — you're already scoped to exactly one training session. Omit round_number for the latest (current) round. Long transcripts come back in chunks: if has_more is true, call again with the same round_number/with_thoughts and offset = this response's offset + content.length to keep reading."
    )]
    async fn get_roleplay_transcript(
        &self,
        Parameters(input): Parameters<get_roleplay_transcript::GetRoleplayTranscriptInput>,
    ) -> Result<CallToolResult, McpError> {
        match get_roleplay_transcript::read(&input) {
            Ok(content) => {
                let json = serde_json::to_string_pretty(&content).map_err(|e| McpError::internal_error(e.to_string(), None))?;
                Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
            }
            Err(message) => Ok(CallToolResult::success(vec![ContentBlock::text(message)])),
        }
    }

    #[tool(
        description = "List every Training Room session (a practice session — Voice Training, Chat Roleplay, Voice Roleplay, Mindset Shifting, or Learning) the user has in Master's Wheel. Returns each session's id, name, discipline (toolType), status, and last-updated time only — never the real notes/transcript content. Always safe to call. Use get_training_session with a session_id from this list to actually read a specific session's content."
    )]
    async fn list_training_sessions(&self) -> Result<CallToolResult, McpError> {
        let sessions = list_training_sessions::list(&crate::mcp::paths::training_root());
        let json = serde_json::to_string_pretty(&sessions).map_err(|e| McpError::internal_error(e.to_string(), None))?;
        Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
    }

    #[tool(
        description = "Read a specific Training Room session's real content (notes and/or transcript) by its session_id from list_training_sessions. Notes and transcript mean whatever that session's discipline actually has — some disciplines may have one and not the other, which is normal, not an error. Long documents come back in chunks: if a returned document's has_more is true, call again with the same session_id/documents and offset = that document's offset + content.length to keep reading, repeating until has_more is false, before answering questions about its full content."
    )]
    async fn get_training_session(
        &self,
        Parameters(get_training_session::GetTrainingSessionInput { session_id, documents, offset, limit }): Parameters<
            get_training_session::GetTrainingSessionInput,
        >,
    ) -> Result<CallToolResult, McpError> {
        let root = crate::mcp::paths::training_root();
        permission::mark_read(ResourceKind::TrainingSession, &session_id).await;
        match get_training_session::read(&root, &session_id, &documents, offset, limit) {
            Ok(content) => {
                let json = serde_json::to_string_pretty(&content).map_err(|e| McpError::internal_error(e.to_string(), None))?;
                Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
            }
            Err(message) => Ok(CallToolResult::success(vec![ContentBlock::text(message)])),
        }
    }
}

#[tool_handler]
impl ServerHandler for MastersWheelServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build()).with_instructions(
            "Tools for seeing the user's Performance Review records (saved sales-call review \
             sessions) and Training Room sessions (any discipline) inside Master's Wheel."
                .to_string(),
        )
    }
}

pub fn run_stdio() {
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(runtime) => runtime,
        Err(e) => {
            eprintln!("masters-wheel mcp server: failed to start tokio runtime: {e}");
            return;
        }
    };
    runtime.block_on(async {
        let service = match MastersWheelServer::new().serve(stdio()).await {
            Ok(service) => service,
            Err(e) => {
                eprintln!("masters-wheel mcp server: failed to start: {e}");
                return;
            }
        };
        if let Err(e) = service.waiting().await {
            eprintln!("masters-wheel mcp server: error while serving: {e}");
        }
    });
}
