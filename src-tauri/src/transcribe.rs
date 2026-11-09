// Generate-transcript pipeline: detect a source file's audio tracks, then
// (per track the user kept) extract it to mp3 and transcribe it via
// ElevenLabs' cloud Speech-to-Text API — the one transcription path this
// app supports, mirroring ~/dev/transcriber's Cloud tier (see that
// project's src/audio_tracks.py + src/transcription.py's
// `_transcribe_with_elevenlabs`). No on-device model, no mic-bleed
// isolation — this app's version of that process is deliberately the
// minimal slice: detect tracks, let the user keep/name them, transcribe.
//
// ffmpeg/ffprobe/curl are shelled out to directly (same approach
// transcriber's Python uses subprocess for) rather than pulling in an HTTP
// or audio-processing crate — the lightest integration for a feature this
// size.
//
// The transcribe step must never block the UI and must be stoppable mid-
// flight (most calls here are a single track, i.e. a single blocking HTTP
// upload+inference call — "stop between tracks" would do nothing for the
// common case). So `generate_transcript` runs as a tracked background job:
// the frontend gets a job id back immediately, progress streams out as
// `generate-transcript-progress` events, and `cancel_generate_transcript`
// kills whichever ffmpeg/curl child process is currently running for that
// job.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

use crate::util::resolve_binary;

#[derive(Serialize)]
pub struct AudioTrack {
    pub index: u32,
    pub title: Option<String>,
}

// ffprobe's own audio-stream listing — same invocation as transcriber's
// `probe_audio_streams`. Only `title` is read as a speaker-name hint for
// the same reason noted there: muxers stamp a generic handler name on
// nearly every stream, so only an explicit `title` tag is trustworthy.
#[tauri::command]
pub fn probe_audio_tracks(source_path: String) -> Result<Vec<AudioTrack>, String> {
    let output = Command::new(resolve_binary("ffprobe"))
        .args([
            "-v",
            "error",
            "-select_streams",
            "a",
            "-show_entries",
            "stream=index,channels:stream_tags=title",
            "-of",
            "json",
            &source_path,
        ])
        .output()
        .map_err(|e| format!("ffprobe isn't available ({e}). Install it with `brew install ffmpeg`."))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Couldn't read that file's audio tracks ({e})."))?;

    let streams = json["streams"].as_array().cloned().unwrap_or_default();
    Ok(streams
        .iter()
        .map(|s| AudioTrack {
            index: s["index"].as_u64().unwrap_or(0) as u32,
            title: s["tags"]["title"]
                .as_str()
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty()),
        })
        .collect())
}

#[derive(Serialize, Clone)]
pub struct WordTiming {
    pub start: f64,
    pub end: f64,
    pub text: String,
    #[serde(rename = "leadSpace")]
    pub lead_space: bool,
    // Only populated when the ElevenLabs call that produced this word asked
    // for diarization (see transcribe_mp3_with_elevenlabs's `diarize` flag,
    // used by generate_voice_transcript) — None for every word from the
    // track-based pipeline above, which already gets its speaker signal
    // from which audio track a word came from.
    #[serde(rename = "speakerId")]
    pub speaker_id: Option<String>,
}

#[derive(Serialize)]
pub struct TrackTranscript {
    pub index: u32,
    pub name: String,
    pub words: Vec<WordTiming>,
}

#[derive(Deserialize, Clone)]
pub struct TrackSelection {
    pub index: u32,
    pub name: String,
}

// One job's cancellation plumbing: a flag checked between steps, plus a
// handle to whichever child process (ffmpeg or curl) is currently running
// so `cancel_generate_transcript` can kill it outright instead of waiting
// for it to finish.
#[derive(Clone)]
struct JobControl {
    cancelled: Arc<AtomicBool>,
    current_child: Arc<Mutex<Option<Child>>>,
}

impl JobControl {
    fn new() -> Self {
        Self { cancelled: Arc::new(AtomicBool::new(false)), current_child: Arc::new(Mutex::new(None)) }
    }

    fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    fn kill_current(&self) {
        if let Some(mut child) = self.current_child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[derive(Default)]
pub struct TranscribeJobs(Mutex<HashMap<String, JobControl>>);

const CANCELLED: &str = "__cancelled__";

#[tauri::command]
pub fn cancel_generate_transcript(jobs: State<'_, TranscribeJobs>, job_id: String) {
    if let Some(control) = jobs.0.lock().unwrap().get(&job_id) {
        control.cancelled.store(true, Ordering::SeqCst);
        control.kill_current();
    }
}

// Spawns `command`, registers it as this job's currently-killable child,
// and waits for it — polling rather than a single blocking `wait()` call,
// so `cancel_generate_transcript` (running on a different invocation) can
// always acquire the child lock in between polls to kill it. stdout/stderr
// are drained on separate threads as soon as the process starts so a
// large response (a long call's word-level JSON) can never deadlock the
// pipe. Returns (success, stdout, stderr); `Err(CANCELLED)` once the job's
// cancellation flag is observed.
fn run_killable(mut command: Command, control: &JobControl) -> Result<(bool, String, String), String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let stdout_reader = child.stdout.take().map(|mut pipe| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let _ = pipe.read_to_end(&mut buf);
            buf
        })
    });
    let stderr_reader = child.stderr.take().map(|mut pipe| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let _ = pipe.read_to_end(&mut buf);
            buf
        })
    });

    *control.current_child.lock().unwrap() = Some(child);
    if control.is_cancelled() {
        control.kill_current();
        return Err(CANCELLED.to_string());
    }

    let success = loop {
        {
            let mut guard = control.current_child.lock().unwrap();
            match guard.as_mut() {
                None => return Err(CANCELLED.to_string()), // killed by cancel() between polls
                Some(child) => {
                    if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                        break status.success();
                    }
                }
            }
        }
        if control.is_cancelled() {
            control.kill_current();
            return Err(CANCELLED.to_string());
        }
        std::thread::sleep(std::time::Duration::from_millis(80));
    };
    *control.current_child.lock().unwrap() = None;

    let stdout_buf = stdout_reader.map(|h| h.join().unwrap_or_default()).unwrap_or_default();
    let stderr_buf = stderr_reader.map(|h| h.join().unwrap_or_default()).unwrap_or_default();
    Ok((success, String::from_utf8_lossy(&stdout_buf).into_owned(), String::from_utf8_lossy(&stderr_buf).into_owned()))
}

fn extract_track_to_mp3(source_path: &str, index: u32, out_path: &Path, control: &JobControl) -> Result<(), String> {
    let mut command = Command::new(resolve_binary("ffmpeg"));
    command.args([
        "-y",
        "-i",
        source_path,
        "-map",
        &format!("0:{index}"),
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-q:a",
        "2",
        &out_path.to_string_lossy(),
    ]);
    let (success, _stdout, stderr) = run_killable(command, control)
        .map_err(|e| if e == CANCELLED { e } else { format!("ffmpeg isn't available ({e}). Install it with `brew install ffmpeg`.") })?;
    if !success {
        return Err(stderr.trim().to_string());
    }
    Ok(())
}

// Same extraction as extract_track_to_mp3, but for Voice Training's single-
// file clips — there's no track-detection/picker step for those (see
// generate_voice_transcript), so this just grabs the file's first audio
// stream (ffmpeg's "a:0" stream specifier) rather than requiring an
// explicit absolute stream index.
fn extract_default_audio_to_mp3(source_path: &str, out_path: &Path, control: &JobControl) -> Result<(), String> {
    let mut command = Command::new(resolve_binary("ffmpeg"));
    command.args([
        "-y",
        "-i",
        source_path,
        "-map",
        "0:a:0",
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-q:a",
        "2",
        &out_path.to_string_lossy(),
    ]);
    let (success, _stdout, stderr) = run_killable(command, control)
        .map_err(|e| if e == CANCELLED { e } else { format!("ffmpeg isn't available ({e}). Install it with `brew install ffmpeg`.") })?;
    if !success {
        return Err(stderr.trim().to_string());
    }
    Ok(())
}

// One blocking HTTP call via `curl` — ElevenLabs Scribe v2, word-level
// timestamps. Same model/params as transcriber's `_transcribe_with_elevenlabs`,
// plus an optional `diarize` flag (Voice Training's "with voice recognition"
// option — see generate_voice_transcript) that asks ElevenLabs to annotate
// each word with which detected voice spoke it (`speaker_id`), rather than
// this app relying on separate audio tracks the way the multi-track
// pipeline above does.
fn transcribe_mp3_with_elevenlabs(
    api_key: &str,
    mp3_path: &Path,
    diarize: bool,
    control: &JobControl,
) -> Result<serde_json::Value, String> {
    let file_arg = format!("file=@{}", mp3_path.to_string_lossy());
    let auth_header = format!("xi-api-key: {api_key}");
    let mut command = Command::new("curl");
    command.args([
        "-sS",
        "-X",
        "POST",
        "https://api.elevenlabs.io/v1/speech-to-text",
        "-H",
        &auth_header,
        "-F",
        "model_id=scribe_v2",
        "-F",
        "timestamps_granularity=word",
        "-F",
        &file_arg,
    ]);
    if diarize {
        command.args(["-F", "diarize=true"]);
    }
    let (success, stdout, stderr) = run_killable(command, control)
        .map_err(|e| if e == CANCELLED { e } else { format!("curl isn't available ({e}).") })?;
    if !success {
        return Err(stderr.trim().to_string());
    }
    let value: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("Unexpected response from ElevenLabs ({e})."))?;
    if let Some(detail) = value.get("detail") {
        return Err(format!("ElevenLabs: {detail}"));
    }
    Ok(value)
}

// ElevenLabs returns a flat per-token stream, not nested per-word objects
// grouped into sentences — same shape transcriber's
// `_elevenlabs_tokens_to_words` reads. A "spacing" token's own text is the
// one signal for whether a real space separates the words either side of
// it (e.g. none before attached punctuation); "audio_event" tokens aren't
// spoken words and are skipped.
fn words_from_elevenlabs_response(value: &serde_json::Value) -> Vec<WordTiming> {
    let mut out = Vec::new();
    let mut pending_space = false;
    let empty: Vec<serde_json::Value> = Vec::new();
    let tokens = value["words"].as_array().unwrap_or(&empty);
    for token in tokens {
        let kind = token["type"].as_str().unwrap_or("");
        if kind == "spacing" {
            if token["text"].as_str().is_some_and(|t| !t.is_empty()) {
                pending_space = true;
            }
            continue;
        }
        if kind != "word" {
            continue;
        }
        let start = token["start"].as_f64();
        let end = token["end"].as_f64();
        let text = token["text"].as_str();
        if let (Some(start), Some(end), Some(text)) = (start, end, text) {
            let speaker_id = token["speaker_id"].as_str().map(|s| s.to_string());
            out.push(WordTiming { start, end, text: text.to_string(), lead_space: pending_space, speaker_id });
            pending_space = false;
        }
    }
    out
}

#[derive(Serialize, Clone)]
struct ProgressEvent {
    #[serde(rename = "jobId")]
    job_id: String,
    stage: &'static str, // "extracting" | "uploading"
    #[serde(rename = "trackIndex")]
    track_index: usize,
    #[serde(rename = "trackCount")]
    track_count: usize,
    #[serde(rename = "trackName")]
    track_name: String,
}

fn emit_progress(app: &AppHandle, job_id: &str, stage: &'static str, track_index: usize, track_count: usize, track_name: &str) {
    let _ = app.emit(
        "generate-transcript-progress",
        ProgressEvent {
            job_id: job_id.to_string(),
            stage,
            track_index,
            track_count,
            track_name: track_name.to_string(),
        },
    );
}

// Detect -> (user picks tracks) -> this: extract each kept track to its
// own mp3 and transcribe it via ElevenLabs, one HTTP call per track.
// Blocking I/O throughout (process spawns, network), so it runs on a
// blocking-friendly task rather than the async runtime's worker threads.
// Registers itself in `jobs` under `job_id` (caller-generated) for the
// lifetime of the call, so `cancel_generate_transcript` can find and kill
// it; always deregisters on the way out, success or failure.
#[tauri::command]
pub async fn generate_transcript(
    app: AppHandle,
    jobs: State<'_, TranscribeJobs>,
    job_id: String,
    source_path: String,
    tracks: Vec<TrackSelection>,
) -> Result<Vec<TrackTranscript>, String> {
    let api_key = std::env::var("ELEVENLABS_API_KEY").map_err(|_| {
        "Cloud transcription isn't set up — add ELEVENLABS_API_KEY to the project's .env \
         (get a key at elevenlabs.io)."
            .to_string()
    })?;

    let control = JobControl::new();
    jobs.0.lock().unwrap().insert(job_id.clone(), control.clone());

    let track_count = tracks.len();
    let result = tauri::async_runtime::spawn_blocking({
        let control = control.clone();
        let job_id = job_id.clone();
        move || -> Result<Vec<TrackTranscript>, String> {
            let mut results = Vec::with_capacity(tracks.len());
            for (track_index, track) in tracks.into_iter().enumerate() {
                if control.is_cancelled() {
                    return Err(CANCELLED.to_string());
                }
                emit_progress(&app, &job_id, "extracting", track_index, track_count, &track.name);
                let tmp_path = std::env::temp_dir().join(format!(
                    "masters-wheel-track-{}-{}.mp3",
                    job_id,
                    track.index
                ));
                let extraction = extract_track_to_mp3(&source_path, track.index, &tmp_path, &control);
                let response = extraction.and_then(|()| {
                    if control.is_cancelled() {
                        return Err(CANCELLED.to_string());
                    }
                    emit_progress(&app, &job_id, "uploading", track_index, track_count, &track.name);
                    // Speaker separation here already comes from which
                    // audio track a word was extracted from — diarization
                    // would be redundant (and is Voice Training's own
                    // option, see generate_voice_transcript below).
                    transcribe_mp3_with_elevenlabs(&api_key, &tmp_path, false, &control)
                });
                let _ = std::fs::remove_file(&tmp_path);
                let value = response?;
                results.push(TrackTranscript {
                    index: track.index,
                    name: track.name,
                    words: words_from_elevenlabs_response(&value),
                });
            }
            Ok(results)
        }
    })
    .await
    .map_err(|e| format!("Internal error generating the transcript ({e})."))?;

    jobs.0.lock().unwrap().remove(&job_id);
    result
}

// Voice Training's own transcription entry point: one clip, one audio
// stream — no track-detection/picker step, since practice clips are a
// single file rather than a multi-mic call recording. `diarize` is the
// "with voice recognition" option dictated for this discipline: off just
// transcribes the clip as one speaker; on asks ElevenLabs to annotate each
// word with which detected voice spoke it, so the caller
// (src/lib/transcript/generate.ts's voiceWordsToDialogueEntries) can group
// the flat word stream into per-speaker dialogue the same way the
// track-based pipeline above does per-track. Shares TranscribeJobs/
// JobControl and the same `generate-transcript-progress` event with that
// pipeline — both are just "one background job with a job id", regardless
// of which domain started it.
#[tauri::command]
pub async fn generate_voice_transcript(
    app: AppHandle,
    jobs: State<'_, TranscribeJobs>,
    job_id: String,
    source_path: String,
    clip_name: String,
    diarize: bool,
) -> Result<Vec<WordTiming>, String> {
    let api_key = std::env::var("ELEVENLABS_API_KEY").map_err(|_| {
        "Cloud transcription isn't set up — add ELEVENLABS_API_KEY to the project's .env \
         (get a key at elevenlabs.io)."
            .to_string()
    })?;

    let control = JobControl::new();
    jobs.0.lock().unwrap().insert(job_id.clone(), control.clone());

    let result = tauri::async_runtime::spawn_blocking({
        let control = control.clone();
        let job_id = job_id.clone();
        move || -> Result<Vec<WordTiming>, String> {
            if control.is_cancelled() {
                return Err(CANCELLED.to_string());
            }
            emit_progress(&app, &job_id, "extracting", 0, 1, &clip_name);
            let tmp_path = std::env::temp_dir().join(format!("masters-wheel-voice-{job_id}.mp3"));
            let extraction = extract_default_audio_to_mp3(&source_path, &tmp_path, &control);
            let response = extraction.and_then(|()| {
                if control.is_cancelled() {
                    return Err(CANCELLED.to_string());
                }
                emit_progress(&app, &job_id, "uploading", 0, 1, &clip_name);
                transcribe_mp3_with_elevenlabs(&api_key, &tmp_path, diarize, &control)
            });
            let _ = std::fs::remove_file(&tmp_path);
            let value = response?;
            Ok(words_from_elevenlabs_response(&value))
        }
    })
    .await
    .map_err(|e| format!("Internal error generating the transcript ({e})."))?;

    jobs.0.lock().unwrap().remove(&job_id);
    result
}
