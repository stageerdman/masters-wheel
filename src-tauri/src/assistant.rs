// Real AI replies for the AIAssistant chat — prototype slice of the
// "AGENTS-ENGINE" research (see updates/2026-10-30 AGENTS-ENGINE - OPEN).
//
// Deliberately NOT the Anthropic API: the user wants their own already-
// authenticated local Claude Code CLI as the engine, not a pay-per-token
// key. So this shells out to `claude -p` headlessly, the same "shell out
// to an external CLI" shape transcribe.rs already uses for ffmpeg/curl.
//
// Claude Code discovers CLAUDE.md by walking up from the process's working
// directory — left at this project's own repo root, every reply would come
// back answering as if it knew masters-wheel's own coding conventions, which
// has nothing to do with being a chat persona for the person using the app.
// `--bare` looked like the fix (it's documented to skip CLAUDE.md/hooks/
// plugins/MCP/memory) but empirically breaks auth in this environment
// ("Not logged in" even when a normal `claude -p` call works) — verified by
// hand before relying on it. Running the subprocess from `std::env::temp_dir()`
// instead sidesteps the whole problem: cwd-walk-up never reaches this repo's
// CLAUDE.md, auth keeps working normally, and nothing else Claude Code
// would normally offer (the user's own global config/memory) is disabled.
// The persona's instructions are injected per-call via `--system-prompt`,
// which *replaces* Claude Code's own default system prompt rather than
// appending to it (`--append-system-prompt`, used originally, left Claude
// Code's own "you are Claude Code" base prompt in place alongside the
// persona — a contradiction the model would resolve by breaking character
// and literally self-identifying as Claude Code when asked a direct "what
// are you" question; confirmed by hand, see this update's wiki.md for the
// repro). A full system-prompt replacement does give up whatever baseline
// tool-use framing Claude Code's default prompt provided — fine for now
// since this slice grants zero tools anyway (see below); revisit if/when
// tool/MCP calling lands and needs that framing back. Knowledge grounding
// (see knowledge/mod.rs) happens entirely on the Rust side before this
// string is built — relevant chunks from the agent's own indexed knowledge
// files are woven in ahead of the persona instructions, so the CLI itself
// never needs file access to "know" anything. No `--allowedTools` are
// granted — this slice is reply-only, no tool calling (that's a later
// increment, see the update's wiki.md), so `--permission-mode dontAsk`
// with an empty allowlist means nothing beyond plain text generation can
// happen even if asked.
//
// Session continuity: the first call for a chat session has no session id;
// claude returns one in its JSON result, which the frontend stores and
// passes back via `--resume` on every later turn in that same session —
// cheaper than a cold start and means the CLI's own transcript (not ours)
// is the source of truth for that agent's memory of the conversation.
//
// Streaming: `ask_agent` is `async` and does its actual subprocess work
// inside `spawn_blocking`, exactly like `transcribe::generate_transcript` —
// a plain synchronous command here would block Tauri's main thread for the
// whole multi-second reply (that was the original bug: the app looked
// frozen/beachballed, not just slow). `--output-format stream-json
// --include-partial-messages` makes the CLI emit one NDJSON line per event
// as it generates, instead of one JSON blob at the end; each
// `content_block_delta` text chunk is forwarded to the frontend immediately
// as an `ask-agent-progress` event (verified by hand: the CLI's stream
// includes `stream_event` wrapper objects around Anthropic's own
// message_start/content_block_delta/message_stop shape). The trailing
// `result` event is still the authoritative final text + session id — same
// fields `ask_agent` used to read out of the old single `json` blob — so a
// dropped/reordered delta can never leave the stored message out of sync
// with what Claude actually said.

use serde::Serialize;
use std::env::temp_dir;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

use crate::knowledge;
use crate::util::resolve_binary;

// Self-serve diagnostics: the frontend posts a label + a JSON snapshot of
// real computed layout state (window size, html/body/AIAssistant DOM node
// geometry) here instead of the browser console, so investigating a
// rendering bug in the packaged app doesn't require the user to open
// devtools at all — just reproduce the symptom once, then read this file.
#[tauri::command]
pub fn debug_log(message: String) -> Result<(), String> {
    let path = temp_dir().join("masters-wheel-debug.log");
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{message}").map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct AgentReply {
    pub text: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    // How full this agent's resumed CLI session is as of this reply — see
    // extract_context_usage below for where these come from. 0/0 means
    // the result event didn't carry usage data (an older CLI version);
    // the frontend treats a zero window as "no data" rather than "full".
    #[serde(rename = "contextTokens")]
    pub context_tokens: u64,
    #[serde(rename = "contextWindow")]
    pub context_window: u64,
}

// `--resume` means every call's `usage` already reflects the *entire*
// conversation so far, not just this one turn — `input_tokens` +
// `cache_read_input_tokens` + `cache_creation_input_tokens` together are
// the full prompt this turn was built from (the cache fields are just
// Anthropic's own prompt-cache split of that same prompt, not separate
// content), and `output_tokens` is this turn's reply, which becomes part
// of the prompt on the *next* turn. Summing all four is what the next
// call will actually start from — the right number for "how full is this
// context right now." `contextWindow` comes from `modelUsage.<model>`;
// there's normally exactly one model per call, so the first entry is
// taken rather than picking a specific key by name.
fn extract_context_usage(event: &serde_json::Value) -> (u64, u64) {
    let usage = &event["usage"];
    let tokens = usage["input_tokens"].as_u64().unwrap_or(0)
        + usage["cache_creation_input_tokens"].as_u64().unwrap_or(0)
        + usage["cache_read_input_tokens"].as_u64().unwrap_or(0)
        + usage["output_tokens"].as_u64().unwrap_or(0);
    let window = event["modelUsage"]
        .as_object()
        .and_then(|models| models.values().next())
        .and_then(|model| model["contextWindow"].as_u64())
        .unwrap_or(0);
    (tokens, window)
}

#[derive(Serialize, Clone)]
struct AskAgentProgress {
    #[serde(rename = "jobId")]
    job_id: String,
    delta: String,
}

fn emit_delta(app: &AppHandle, job_id: &str, delta: &str) {
    let _ = app.emit("ask-agent-progress", AskAgentProgress { job_id: job_id.to_string(), delta: delta.to_string() });
}

// How many knowledge excerpts to pull into one reply's prompt — enough to
// cover a question thoroughly without ballooning every turn's token cost,
// regardless of how large the agent's underlying knowledge base is (see
// knowledge/prompt.rs and this update's wiki.md).
const RETRIEVAL_TOP_K: usize = 8;

#[tauri::command]
pub async fn ask_agent(
    app: AppHandle,
    bridge: tauri::State<'_, crate::mcp::bridge::Bridge>,
    job_id: String,
    message: String,
    instructions: String,
    agent_id: Option<String>,
    session_id: Option<String>,
    // The ChatSession id (distinct from `session_id` above, which is the
    // per-agent *Claude CLI* resume session) — threaded into the
    // generated --mcp-config's env so mcp/permission.rs knows which
    // chat's tags/always-allowed list to check. See mcp/bridge.rs.
    chat_session_id: String,
    // Where this agent's own knowledge.db physically lives — an agent can
    // now be chatted with from any Space it's available in, but its
    // indexed knowledge files only ever live under the one Space it was
    // actually created in (see src/lib/agents/types.ts's homeSpaceFolder).
    agent_space_folder: String,
    // Which Space this *chat* belongs to — scopes which Space's
    // Performance Review records the MCP tools can see (via
    // mcp/config.rs). Deliberately separate from agent_space_folder: the
    // records a chat's tools can reach are always the Space the user is
    // actually sitting in, regardless of which Space the agent lives in.
    active_space_folder: String,
    // Only ever passed by AITrainerPane's call site — the training
    // session (folder name == session id, see src/lib/training) this
    // chat is embedded in. When present, grants get_roleplay_transcript
    // for this call only (see mcp/config.rs::TRAINING_ALLOWED_TOOLS);
    // every ordinary chat passes None and never declares that tool at all.
    training_session_id: Option<String>,
) -> Result<AgentReply, String> {
    // Cloned out of the State wrapper (cheap — Bridge is just an Arc)
    // before moving into spawn_blocking: tauri::State's own lifetime
    // isn't 'static, so it can't be moved into the blocking closure
    // directly the way `app` can.
    let bridge = (*bridge).clone();
    tauri::async_runtime::spawn_blocking(move || -> Result<AgentReply, String> {
        // What's actually tagged for this chat right now, title-resolved
        // for the model to read — see knowledge/prompt.rs's
        // build_tagged_context for why this has to be spelled out
        // explicitly rather than trusted to be "visible" from the tag
        // just existing in the UI. Split by resource kind since
        // Performance Review records and Training Room sessions each get
        // their own context block/tool (see knowledge::prompt).
        let records_root = crate::spaces::records_dir(&app, &active_space_folder)?;
        let training_root = crate::spaces::training_dir(&app, &active_space_folder)?;
        let all_tags = bridge.tags_for_session(&chat_session_id);
        let tagged_records: Vec<(String, String)> = all_tags
            .iter()
            .filter(|(kind, _, _)| *kind == crate::mcp::bridge::ResourceKind::PerformanceReview)
            .map(|(_, id, _)| {
                let title = crate::mcp::tools::get_performance_review::title_for(&records_root, id);
                (id.clone(), title)
            })
            .collect();
        let tagged_training_sessions: Vec<(String, String)> = all_tags
            .iter()
            .filter(|(kind, _, _)| *kind == crate::mcp::bridge::ResourceKind::TrainingSession)
            .map(|(_, id, _)| {
                let title = crate::mcp::tools::get_training_session::title_for(&training_root, id);
                (id.clone(), title)
            })
            .collect();

        // Knowledge grounding: if this agent has any indexed knowledge
        // files, pull the chunks most relevant to this message and weave
        // them into the system prompt ahead of the persona instructions.
        // A retrieval failure (e.g. the embedding model hasn't finished
        // loading) shouldn't block a reply — it just falls back to
        // persona-only, same as an agent with no knowledge files at all.
        // Every path still goes through build_augmented_system_prompt
        // (never a bare `instructions.clone()`) — the persona wrapper it
        // applies isn't optional cosmetic framing, it's what keeps Claude
        // Code from breaking character and self-identifying instead of
        // the persona (see this update's wiki.md for the repro).
        let system_prompt = match &agent_id {
            Some(id) => match knowledge::commands::retrieve_for_agent(&app, &agent_space_folder, id, &message, RETRIEVAL_TOP_K) {
                Ok(chunks) => knowledge::prompt::build_augmented_system_prompt(&instructions, &chunks, &tagged_records, &tagged_training_sessions, training_session_id.as_deref()),
                Err(_) => knowledge::prompt::build_augmented_system_prompt(&instructions, &[], &tagged_records, &tagged_training_sessions, training_session_id.as_deref()),
            },
            None => knowledge::prompt::build_augmented_system_prompt(&instructions, &[], &tagged_records, &tagged_training_sessions, training_session_id.as_deref()),
        };

        // --mcp-config points the CLI at this app's own MCP server (a
        // re-exec of this same binary — see mcp/server.rs); --strict-mcp-config
        // means *only* that server's tools are even considered, so no other
        // registered skill/MCP source gets its schema declared on this
        // call. --allowedTools then grants exactly the tools this app
        // actually wires, nothing implicit.
        //
        // --tools "" is still required *in addition* to all of the above —
        // found by hand as a real regression, not a theoretical one:
        // --mcp-config/--allowedTools control MCP tools and permissions,
        // but say nothing about the CLI's own built-in tool set (Bash,
        // Edit, Read, Task, ToolSearch, …), which --tools alone controls
        // ("Specify the list of available tools from the built-in set" —
        // `claude -p --help`). Dropping --tools "" when this file first
        // added --mcp-config silently reintroduced the exact ~20k+
        // tokens/reply of built-in-tool schema bloat the prior `--tools ""`
        // fix (commit 5f325a4) already eliminated once — confirmed by a
        // live user report of a 127k-token reply, then reproduced by hand
        // (a trivial "hi" call: ~30k total input tokens without this flag
        // vs. ~10k with it) and fixed here. Verified this doesn't break
        // MCP tool calling: the model still calls get_performance_review
        // correctly with --tools "" present — if anything it's faster,
        // since the tool schema is then declared directly instead of
        // needing a separate discovery round-trip first. See this
        // update's wiki.md for the full repro.
        // records_root/training_root were already resolved above (needed
        // there for tagged-resource title lookups too).
        let training_session_path =
            training_session_id.as_ref().map(|id| training_root.join(id).to_string_lossy().into_owned());
        let mcp_config_path = crate::mcp::config::write_config_file(
            &chat_session_id,
            agent_id.as_deref().unwrap_or(""),
            &records_root.to_string_lossy(),
            &training_root.to_string_lossy(),
            training_session_path.as_deref(),
        )
        .map_err(|e| format!("Couldn't prepare MCP tools: {e}"))?;

        // get_roleplay_transcript is only ever declared for this one
        // call when it's actually scoped to a training session —
        // list_training_sessions/get_training_session are always in
        // ALLOWED_TOOLS now, same as the Performance Review pair.
        let mut allowed_tools: Vec<&str> = crate::mcp::config::ALLOWED_TOOLS.to_vec();
        if training_session_path.is_some() {
            allowed_tools.extend_from_slice(crate::mcp::config::TRAINING_ALLOWED_TOOLS);
        }

        let binary = resolve_binary("claude");
        let mut command = Command::new(&binary);
        command
            .current_dir(temp_dir())
            .arg("-p")
            .arg(&message)
            .arg("--output-format")
            .arg("stream-json")
            .arg("--include-partial-messages")
            .arg("--verbose")
            .arg("--system-prompt")
            .arg(&system_prompt)
            .arg("--permission-mode")
            .arg("dontAsk")
            .arg("--mcp-config")
            .arg(&mcp_config_path)
            .arg("--strict-mcp-config")
            .arg("--allowedTools")
            .arg(allowed_tools.join(","))
            .arg("--tools")
            .arg("")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(id) = session_id.filter(|id| !id.is_empty()) {
            command.arg("--resume").arg(id);
        }

        let mut child = command.spawn().map_err(|e| {
            format!("The Claude Code CLI isn't available ({e}). Make sure `claude` is installed and you're logged in.")
        })?;

        // Drain stderr on its own thread while this thread reads stdout line
        // by line below — reading one pipe to completion while the other
        // fills up unread is the classic way to deadlock a child process.
        let stderr_reader = child.stderr.take().map(|mut pipe| {
            std::thread::spawn(move || {
                let mut buf = Vec::new();
                let _ = pipe.read_to_end(&mut buf);
                buf
            })
        });

        let stdout = child.stdout.take().expect("stdout was piped");
        let mut final_text = String::new();
        let mut final_session_id = String::new();
        let mut is_error = false;
        let mut final_context_tokens = 0u64;
        let mut final_context_window = 0u64;

        for line in BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if line.trim().is_empty() {
                continue;
            }
            let Ok(event) = serde_json::from_str::<serde_json::Value>(&line) else {
                continue;
            };
            match event.get("type").and_then(|v| v.as_str()) {
                Some("stream_event") => {
                    let inner = &event["event"];
                    if inner.get("type").and_then(|v| v.as_str()) == Some("content_block_delta") {
                        if let Some(delta) = inner["delta"]["text"].as_str() {
                            emit_delta(&app, &job_id, delta);
                        }
                    }
                }
                Some("result") => {
                    final_text = event.get("result").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                    final_session_id = event.get("session_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                    is_error = event.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false);
                    let (tokens, window) = extract_context_usage(&event);
                    final_context_tokens = tokens;
                    final_context_window = window;
                }
                _ => {}
            }
        }

        let status = child.wait().map_err(|e| e.to_string())?;
        let stderr_text = stderr_reader
            .map(|handle| String::from_utf8_lossy(&handle.join().unwrap_or_default()).trim().to_string())
            .unwrap_or_default();

        if is_error || !status.success() {
            return Err(if !stderr_text.is_empty() {
                stderr_text
            } else if !final_text.is_empty() {
                final_text
            } else {
                "Claude didn't return a reply.".to_string()
            });
        }

        Ok(AgentReply {
            text: final_text,
            session_id: final_session_id,
            context_tokens: final_context_tokens,
            context_window: final_context_window,
        })
    })
    .await
    .map_err(|e| format!("Internal error talking to Claude ({e})."))?
}

// Auto-titling a chat after its first message — the same beat Claude's
// own chat UI and ChatGPT do it at. Deliberately NOT ask_agent: no
// persona system prompt, no --resume (one-shot, no session to continue),
// no --mcp-config/--allowedTools, run from temp_dir same as ask_agent so
// this repo's own CLAUDE.md never leaks in. `.output()` (not the manual
// stdout/stderr-draining dance ask_agent uses) is fine here — a short
// non-streaming reply is small enough that `Command::output()`'s own
// internal draining can't deadlock the way reading one pipe to
// completion while the other fills up could on a long streamed reply.
const NAME_CHAT_SYSTEM_PROMPT: &str = "You generate short chat titles. Reply with ONLY a concise 3-6 word title summarizing the user's message below. No quotes, no trailing punctuation, no explanation — just the title.";

const NAME_CHAT_MAX_LEN: usize = 60;

#[tauri::command]
pub async fn name_chat(message: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let binary = resolve_binary("claude");
        let output = Command::new(&binary)
            .current_dir(temp_dir())
            .arg("-p")
            .arg(&message)
            .arg("--output-format")
            .arg("json")
            .arg("--system-prompt")
            .arg(NAME_CHAT_SYSTEM_PROMPT)
            .arg("--permission-mode")
            .arg("dontAsk")
            .arg("--tools")
            .arg("")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("The Claude Code CLI isn't available ({e})."))?;

        if !output.status.success() {
            let stderr_text = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if stderr_text.is_empty() { "Couldn't name the chat.".to_string() } else { stderr_text });
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let event: serde_json::Value =
            serde_json::from_str(stdout.trim()).map_err(|e| format!("Couldn't parse title response: {e}"))?;
        let is_error = event.get("is_error").and_then(|v| v.as_bool()).unwrap_or(false);
        let result = event.get("result").and_then(|v| v.as_str()).unwrap_or_default();
        // Defensive cleanup in case the model wraps the title in quotes or
        // adds a stray second line anyway — only the first line, trimmed
        // of quote characters, and capped, is ever trusted as the title.
        let title: String = result
            .lines()
            .next()
            .unwrap_or("")
            .trim_matches(|c: char| c == '"' || c == '\'')
            .trim()
            .chars()
            .take(NAME_CHAT_MAX_LEN)
            .collect();

        if is_error || title.is_empty() {
            return Err("No title generated.".to_string());
        }
        Ok(title)
    })
    .await
    .map_err(|e| format!("Internal error naming chat ({e})."))?
}
