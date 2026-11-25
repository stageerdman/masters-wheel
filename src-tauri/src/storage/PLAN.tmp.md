(Temporary build plan; delete before the final commit.)

Remaining storage/ files:
1. policy.rs: pure next_step(video, Conditions{mode,now,online,signed_in,cloud_full,in_use,room_ok}) -> Step{DeleteInCloud,Check,Upload,Download,Offload,Wait}.
   wants_on_mac: Backup=true, Always=false, Smart = now < smart_keep_until.
   Order: removed->DeleteInCloud; !online||!signed_in->Wait; awaiting_check->Check; on_mac && no receipt -> Upload unless Unreadable or cloud_full;
   on_mac && receipt && !wants && !in_use -> Offload; !on_mac && receipt && wants && room_ok && problem!=Missing -> Download.
2. ledger.rs: Ledger{mode,account,videos:BTreeMap} load/save atomic (tmp+rename) at <app_data>/onedrive/videos.json; pure reconcile(found):
   new->entry on_mac; missing on-mac with receipt -> on_mac=false; missing without receipt -> drop; size/name changed -> clear receipt/upload.
3. scan.rs: read <wheel_root>/spaces.json (spaces[].id/folderName), list records/*/hero.* (ignore dotfiles/webloc).
4. cloud.rs: trait Cloud {find(path), item(id), ensure_folder, start_upload(path), upload_chunk, upload_status, download(id, part), delete(id)}
   + CloudError{Offline,SignedOut,Full,Revoked,NotFound,RangeMismatch,Unreadable,Transient} from OneDriveError
   (Http->Offline, NotConnected/SignInExpired/401->SignedOut, 403->Revoked, 507->Full, 404, 416, 429/5xx->Transient).
   GraphCloud{app} via OneDriveSession::access_token + onedrive::drive.
5. layout.rs: cloud_path = seg(space_folder)/Performance Reviews/YYYY-MM(added_at UTC)/seg(record_id).ext; seg mirrors layout.ts cloudSegment.
6. engine.rs: Engine{ledger,pins,health,backoff}; plan(now,disk)->Option<Job>; perform(job,&dyn Cloud,scratch)->Outcome
   (10 MiB chunks = 32*320KiB; 416 -> upload_status; dedupe via find(path) same size); finish(job,result) under lock.
   Offload re-checks policy + local size == receipt.size, writes webloc, deletes. Download to .part, verify size, rename, remove webloc.
   video_opened (Smart: reset watched only if on_mac or room), pins, set_mode, set_account (different account -> clear receipts of on-mac videos).
   Tests with FakeCloud + temp dirs: every mode, switches (Backup->Always, Always->Smart, Smart->Backup, mid-upload), offline, never-offload-unconfirmed, resume after restart.
7. status.rs: overview for UI.
8. service.rs worker thread + Condvar + emit "storage://changed"; commands.rs (storage_overview, storage_set_mode, storage_video_opened/closed(path),
   storage_video_removed(path), storage_cloud_videos(spaceFolder), storage_wake, storage_retry_unreadable).
9. Wire: lib.rs; media_server resolver -> 302 to download_url (cache 30 min) for missing files; transcribe.rs pin during generate_transcript;
   TS wrappers in src/lib/onedrive; records listRecords merges cloud heroes; PerformanceReview.script.ts opened/closed on heroSrc, removed on delete.
10. Docs: update v1.md phases 2-4, wiki.md, FEATURES.md; feature tool pct; commit.

Out of scope (report as next): disconnect with download-back (SPEC 5.7), transcribing a cloud-only video, UI glyphs/status line/mode picker.
Rules: never offload unless receipt + fresh cloud size check + not pinned + online. log::info!(target: "storage", "[key] ...").
