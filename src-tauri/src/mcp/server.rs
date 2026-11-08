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

use crate::mcp::permission::{self, Access};
use crate::mcp::tools::{get_performance_review, get_roleplay_transcript, list_performance_reviews};

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
        description = "List every Performance Review record (a saved sales-call review session) the user has in Master's Wheel. Returns each record's id, title, date, status, and description only — never the real notes/transcript/analysis content. Always safe to call, no permission needed. Use get_performance_review with a recordId from this list to actually read a specific record's content (that one may require the user's permission)."
    )]
    async fn list_performance_reviews(&self) -> Result<CallToolResult, McpError> {
        let reviews = list_performance_reviews::list(&crate::mcp::paths::records_root());
        let json = serde_json::to_string_pretty(&reviews)
            .map_err(|e| McpError::internal_error(e.to_string(), None))?;
        Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
    }

    #[tool(
        description = "Read a specific Performance Review record's real content (notes, transcript, and/or AI analysis) by its record_id from list_performance_reviews. The first time a given record comes up in this conversation, this may need the user's permission — if declined, you'll get a plain message back instead of the content. Don't keep re-asking for the same declined record without the user bringing it up again themselves. Long documents come back in chunks: if a returned document's has_more is true, call again with the same record_id/documents and offset = that document's offset + content.length to keep reading, repeating until has_more is false, before answering questions about its full content."
    )]
    async fn get_performance_review(
        &self,
        Parameters(get_performance_review::GetPerformanceReviewInput { record_id, documents, offset, limit }): Parameters<
            get_performance_review::GetPerformanceReviewInput,
        >,
    ) -> Result<CallToolResult, McpError> {
        let title = get_performance_review::title_for(&record_id);
        let document_label = documents.join(", ");
        match permission::check_access(&record_id, &document_label, &title)
            .await
            .map_err(|e| McpError::internal_error(e, None))?
        {
            Access::Allowed => {
                let content = get_performance_review::read(&record_id, &documents, offset, limit);
                let json = serde_json::to_string_pretty(&content).map_err(|e| McpError::internal_error(e.to_string(), None))?;
                Ok(CallToolResult::success(vec![ContentBlock::text(json)]))
            }
            Access::Declined => Ok(CallToolResult::success(vec![ContentBlock::text(
                "The user declined access to this Performance Review record. Don't ask again for \
                 this record in this conversation unless the user brings it up themselves."
                    .to_string(),
            )])),
        }
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
}

#[tool_handler]
impl ServerHandler for MastersWheelServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build()).with_instructions(
            "Tools for seeing the user's Performance Review records (saved sales-call review \
             sessions) and Training Room roleplay transcripts inside Master's Wheel."
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
