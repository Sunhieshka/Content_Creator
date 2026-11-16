      // Sidebar icons (24×24 stroke paths), keyed by sidebar section.
      const SIDEBAR_ICONS = {
        "projects": <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>,
        "visual-understanding": <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></>,
        "hybrid-studio": <><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 15l5-5 4 4 3-3 6 6"></path><circle cx="12" cy="9" r="2.2" fill="currentColor" fillOpacity="0.35"></circle></>,
        "previz": <><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8" cy="15" r="1.6"></circle><circle cx="15" cy="8" r="1.6"></circle><path d="M9.5 13.5 13.5 9.5"></path><path d="M16 17h3M17.5 15.5v3"></path></>,
        "character-masking": <><circle cx="12" cy="7" r="3.5"></circle><path d="M5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21z" fill="currentColor" fillOpacity="0.25"></path></>,
        "location-variations": <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"></path><circle cx="12" cy="10" r="2.3"></circle></>,
        "canvas": <><rect x="3" y="3" width="6" height="6" rx="1.5"></rect><rect x="15" y="15" width="6" height="6" rx="1.5"></rect><rect x="15" y="3" width="6" height="6" rx="1.5"></rect><path d="M9 6h6M18 9v6M9 6c3 0 3 12 6 12"></path></>,
        "skill-library": <><path d="M2 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"></path><path d="M22 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"></path></>,
        "character-generation": <><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></>,
        "character-sheets": <><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></>,
        "script-to-prompt": <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><path d="M14 3v6h6M8 13h8M8 17h5"></path></>,
        "storyboard": <><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 21V9"></path></>,
        "seedream-image": <><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path></>,
        "seedream-layers": <><path d="m12 2 10 5-10 5L2 7z"></path><path d="m2 17 10 5 10-5M2 12l10 5 10-5"></path></>,
        "seedream-edit": <><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></>,
        "video-generation": <><path d="m22 8-6 4 6 4V8z"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></>,
        "long-duration": <><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M7 4v16M17 4v16M2 12h20"></path></>,
        "video-editor": <><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"></path></>,
        "video-enhancer": <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"></path>,
        "combine-videos": <><rect x="2" y="7" width="8" height="10" rx="1"></rect><rect x="14" y="7" width="8" height="10" rx="1"></rect><path d="M10 12h4"></path></>,
        "seed-audio": <><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></>,
        "audiobook": <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"></path>,
        "audio-black-video": <><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M7 10v4M10 8v8M13 11v2M16 9v6"></path></>,
        "blender-3d": <><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"></path><path d="M3.3 7 12 12l8.7-5M12 22V12"></path></>,
        "motion-blockout": <><rect x="3" y="11" width="8" height="8" rx="1"></rect><path d="M14 7h7v7M21 7l-8 8"></path><circle cx="7" cy="6" r="2"></circle></>,
        "skeleton-reference": <><circle cx="12" cy="4" r="2"></circle><path d="M12 6v8M8 9h8M12 14l-3 7M12 14l3 7"></path></>,
        default: <circle cx="12" cy="12" r="8"></circle>,
      };

      function App() {
        const [ffmpegAvailable, setFfmpegAvailable] = useState(true);
        // Models behind Character Generation, Character Sheets, Script to Prompt and Storyboard (from /api/system/capabilities).
        const [modelInfo, setModelInfo] = useState(null);
        // Download names use the app-wide image model (also read by the tools in static/*.jsx).
        window.__ccImageModel = modelInfo?.image?.label || "Seedream";
        const [files, setFiles] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState("");
        const fileInputRef = useRef(null);
        const scriptPdfInputRef = useRef(null);
        const [t2iPrompt, setT2iPrompt] = useState("");
        const [t2iLoading, setT2iLoading] = useState(false);
        const [t2iImage, setT2iImage] = useState("");
        const [t2iAssetId, setT2iAssetId] = useState("");
        const [t2iGroupId, setT2iGroupId] = useState("");
        const [t2iError, setT2iError] = useState("");
        const [useT2IForSheets, setUseT2IForSheets] = useState(true);
        const [useT2IForVideoAll, setUseT2IForVideoAll] = useState(false);
        const [useT2IForWb, setUseT2IForWb] = useState(false);
        const [i2iSourceImages, setI2iSourceImages] = useState([]);
        const [i2iPrompt, setI2iPrompt] = useState("");
        const [i2iLoading, setI2iLoading] = useState(false);
        const [i2iImage, setI2iImage] = useState("");
        const [i2iAssetId, setI2iAssetId] = useState("");
        const [i2iGroupId, setI2iGroupId] = useState("");
        const [i2iError, setI2iError] = useState("");
        const [useI2IForSheets, setUseI2IForSheets] = useState(false);
        // Reference-ready character generation (Seed LLM bible + prompt) and the QA-checked sheet job.
        const [t2iMeta, setT2iMeta] = useState(null);
        const [i2iMeta, setI2iMeta] = useState(null);
        const [charEngineer, setCharEngineer] = useState(() => {
          try { return localStorage.getItem("cc_char_engineer") !== "0"; } catch (e) { return true; }
        });
        const [sheetNotes, setSheetNotes] = useState("");
        const [sheetQa, setSheetQa] = useState(null);
        const [sheetQaView, setSheetQaView] = useState(null);
        const sheetPollers = useRef({});
        useEffect(() => {
          try { localStorage.setItem("cc_char_engineer", charEngineer ? "1" : "0"); } catch (e) {}
        }, [charEngineer]);
        const [useI2IForVideoAll, setUseI2IForVideoAll] = useState(false);
        const [useI2IForWb, setUseI2IForWb] = useState(false);
        const [charGenTab, setCharGenTab] = useState("t2i");
        const [videoPrompt, setVideoPrompt] = useState("");
        const [videoDraftTaskId, setVideoDraftTaskId] = useState("");
        // Draft mode (Seedance 2.5): a cheap 480p preview first, then the final 1080p or 4K from its task id.
        const [videoDraftMode, setVideoDraftMode] = useState(false);
        const [videoExtraRefImages, setVideoExtraRefImages] = useState([]);
        const [videoRefUploadError, setVideoRefUploadError] = useState("");
        const [videoAudioRefs, setVideoAudioRefs] = useState([]);
        const [videoAudioUploadError, setVideoAudioUploadError] = useState("");
        const [videoRefVideos, setVideoRefVideos] = useState([]);
        const [videoRefVideoUploadError, setVideoRefVideoUploadError] = useState("");
        const [useVideoRefVideosForShotA, setUseVideoRefVideosForShotA] = useState(false);
        const [videoResolution, setVideoResolution] = useState("720p");
        const [videoRatio, setVideoRatio] = useState("16:9");
        const [videoDuration, setVideoDuration] = useState(11);
        const [videoSmartLength, setVideoSmartLength] = useState(false);
        const [videoFps, setVideoFps] = useState(24);
        const [videoOutputFormat, setVideoOutputFormat] = useState("mp4");
        const [videoModel, setVideoModel] = useState(DEFAULT_VIDEO_MODEL_ID);
        // Duplicates of the Video Generation tool created with its "+" button.
        // Each clone is a fully self-contained generation (own prompt,
        // references, model, output settings and job state) so several shots can
        // be set up and run side by side.
        const [videoClones, setVideoClones] = useState([]);
        const [longResolution, setLongResolution] = useState("720p");
        const [longRatio, setLongRatio] = useState("16:9");
        const [longFps, setLongFps] = useState(24);
        const [longOutputFormat, setLongOutputFormat] = useState("mp4");
        const [longDuration, setLongDuration] = useState(11);
        const [longSeed, setLongSeed] = useState(-1);
        const [longModel, setLongModel] = useState(DEFAULT_VIDEO_MODEL_ID);
        const [activeSection, setActiveSection] = useState("character-generation");
        const [videoLoading, setVideoLoading] = useState(false);
        // One entry per parallel video launched by a single run. videoUrl stays
        // the panel's canonical result (the first variation that lands), so
        // Long Duration seeding and the project's saved video keep working off
        // one url as before.
        const [videoVariants, setVideoVariants] = useState([]);
        // Which of the parallel videos the panel is pointing at: the one saved
        // as the project's video and the one handed to Long Duration Shot A.
        const [videoSelectedVariant, setVideoSelectedVariant] = useState(0);
        const [videoUrl, setVideoUrl] = useState("");
        const [videoError, setVideoError] = useState("");
        const [videoGeneratedPrompt, setVideoGeneratedPrompt] = useState("");
        const [videoTextOverlay, setVideoTextOverlay] = useState(defaultTextOverlayState());
        const [videoAutoTextOverlays, setVideoAutoTextOverlays] = useState(true);
        const [longAutoTextOverlays, setLongAutoTextOverlays] = useState(true);
        const [combineUploads, setCombineUploads] = useState([]);
        const [combineLoading, setCombineLoading] = useState(false);
        const [combineError, setCombineError] = useState("");
        const [combineResultUrl, setCombineResultUrl] = useState("");
        const [audioBlackUploads, setAudioBlackUploads] = useState([]);
        const [skeletonAvailable, setSkeletonAvailable] = useState(true);
        const [skeletonUploads, setSkeletonUploads] = useState([]);
        const [skeletonMode, setSkeletonMode] = useState("balanced");
        const [skeletonKptThr, setSkeletonKptThr] = useState(0.43);
        const [skeletonAllPeople, setSkeletonAllPeople] = useState(false);
        const [skeletonGenerateSkeleton, setSkeletonGenerateSkeleton] = useState(true);
        const [skeletonGenerateOverlay, setSkeletonGenerateOverlay] = useState(true);
        const [longShots, setLongShots] = useState([
          { label: "SHOT A", prompt: "", loading: false, variants: [], selectedVariant: 0, videoUrl: "", videoAssetId: "", videoAssetUrl: "", lastFrameUrl: "", generatedPrompt: "", error: "", refImages: [], refImageError: "", refAudios: [], refAudioError: "", refVideos: [], refVideoError: "", textOverlay: defaultTextOverlayState() },
          { label: "SHOT B", prompt: "", loading: false, variants: [], selectedVariant: 0, videoUrl: "", videoAssetId: "", videoAssetUrl: "", lastFrameUrl: "", generatedPrompt: "", error: "", refImages: [], refImageError: "", refAudios: [], refAudioError: "", refVideos: [], refVideoError: "", textOverlay: defaultTextOverlayState() },
        ]);
        const [longExpanded, setLongExpanded] = useState({ "SHOT A": true, "SHOT B": true });
        const [longExtraRefImages, setLongExtraRefImages] = useState([]);
        const [longCombinedUrl, setLongCombinedUrl] = useState("");
        const [longCombineLoading, setLongCombineLoading] = useState(false);
        const [longCombineError, setLongCombineError] = useState("");
        const [shotASeedVideoDataUrl, setShotASeedVideoDataUrl] = useState("");
        const [shotASeedVideoName, setShotASeedVideoName] = useState("");
        const [shotASeedVideoAssetId, setShotASeedVideoAssetId] = useState("");
        const [shotASeedVideoAssetUrl, setShotASeedVideoAssetUrl] = useState("");
        const [shotASeedLoading, setShotASeedLoading] = useState(false);
        const [shotASeedError, setShotASeedError] = useState("");
        const [shotASeedSource, setShotASeedSource] = useState("");
        const [shotASeedSourceUrl, setShotASeedSourceUrl] = useState("");
        const [modalImageUrl, setModalImageUrl] = useState("");
        const closeImageViewer = useCallback(() => setModalImageUrl(""), []);
        // Tools in static/*.jsx open images here instead of in a new tab.
        useEffect(() => { window.openImageViewer = setModalImageUrl; return () => { delete window.openImageViewer; }; }, []);

        const [images, setImages] = useState({
          instruction_1: "",
        });
        const [assetIds, setAssetIds] = useState({
          instruction_1: "",
        });
        const [assetGroupId, setAssetGroupId] = useState("");
        const [sheetSelections, setSheetSelections] = useState({
          instruction_1: true,
        });
        const [useSheetsInVideo, setUseSheetsInVideo] = useState(false);
        const [useSheetsInLong, setUseSheetsInLong] = useState(false);
        const [useSheetsInWb, setUseSheetsInWb] = useState(false);
        const [longLinkedSheetRefs, setLongLinkedSheetRefs] = useState([]);
        // Which take of each shot goes into the combined video: { [shot label]: take index | "skip" }.
        const [longCombinePick, setLongCombinePick] = useState({});

        const [scriptSourceText, setScriptSourceText] = useState("");
        const [scriptPdfFile, setScriptPdfFile] = useState(null);
        const [scriptPromptLoading, setScriptPromptLoading] = useState(false);
        const [scriptPromptOutput, setScriptPromptOutput] = useState("");
        const [scriptPromptError, setScriptPromptError] = useState("");

        // Storyboard state
        const [wbScript, setWbScript] = useState("");
        const [wbSubject, setWbSubject] = useState("");
        const [wbAction, setWbAction] = useState("");
        const [wbEnvironment, setWbEnvironment] = useState("");
        const [wbLighting, setWbLighting] = useState("");
        const [wbCamera, setWbCamera] = useState("");
        const [wbStyle, setWbStyle] = useState("");
        const [wbQuality, setWbQuality] = useState("");
        const [wbRefImages, setWbRefImages] = useState([]);
        const [wbRefVideos, setWbRefVideos] = useState([]);
        const [wbCoreOpen, setWbCoreOpen] = useState(false);
        const [wbPromptText, setWbPromptText] = useState("");
        const [wbStoryboardImage, setWbStoryboardImage] = useState("");
        const [useWbStoryboardForVideo, setUseWbStoryboardForVideo] = useState(false);
        const [useWbStoryboardForLong, setUseWbStoryboardForLong] = useState(false);
        const [wbCameraTipsOpen, setWbCameraTipsOpen] = useState(false);
        const [wbPromptsLoading, setWbPromptsLoading] = useState(false);
        const [wbGenerateLoading, setWbGenerateLoading] = useState(false);
        const [wbError, setWbError] = useState("");

        function defaultProjectDrafts() {
          return {
            charGenTab: "t2i",
            t2iPrompt: "",
            i2iPrompt: "",
            scriptSourceText: "",
            wbScript: "",
            wbSubject: "",
            wbAction: "",
            wbEnvironment: "",
            wbLighting: "",
            wbCamera: "",
            wbStyle: "",
            wbQuality: "",
            wbPromptText: "",
            videoPrompt: "",
            // Video Generation reference uploads and output parameters — must
            // stay per-project. Previously these lived only in component
            // state with no project-scoped persistence, so uploading a
            // reference image/video/audio or changing resolution/ratio/
            // duration in one project silently carried over into whichever
            // project was opened next.
            videoExtraRefImages: [],
            videoAudioRefs: [],
            videoRefVideos: [],
            useVideoRefVideosForShotA: false,
            videoResolution: "720p",
            videoRatio: "16:9",
            videoDuration: 11,
            videoSmartLength: false,
            videoFps: 24,
            videoModel: DEFAULT_VIDEO_MODEL_ID,
            videoClones: [],
            // Text Overlay projects: build overlay images automatically on Generate.
            videoAutoTextOverlays: true,
            longAutoTextOverlays: true,
            // Long Duration output parameters — same per-project requirement.
            longResolution: "720p",
            longRatio: "16:9",
            longFps: 24,
            longDuration: 11,
            longSeed: -1,
            longModel: DEFAULT_VIDEO_MODEL_ID,
            longExtraRefImages: [],
            shotASeedVideoDataUrl: "",
            shotASeedVideoName: "",
            shotASeedVideoAssetId: "",
            shotASeedVideoAssetUrl: "",
            shotASeedSource: "",
            shotASeedSourceUrl: "",
            longShots: [
              { label: "SHOT A", prompt: "", refImages: [], refAudios: [], refVideos: [] },
              { label: "SHOT B", prompt: "", refImages: [], refAudios: [], refVideos: [] },
            ],
          };
        }

        function defaultProjectResults() {
          return {
            t2iAssetId: "",
            i2iAssetId: "",
            scriptPromptOutput: "",
            images: {
              instruction_1: "",
            },
            wbStoryboardAssetId: "",
            videoAssetId: "",
            videoGeneratedPrompt: "",
            // Live generation state per tool, each owned exclusively by
            // applyProjectJobUpdate()/applyVideoJobUpdate()/applyLongShotUpdate() so a
            // job started here keeps updating correctly (and lands in the right place)
            // even if the user switches to a different project mid-generation.
            videoJob: { url: "", loading: false, error: "", generatedPrompt: "", variants: [], selectedVariant: 0, textOverlay: defaultTextOverlayState() },
            t2iJob: { loading: false, image: "", assetId: "", groupId: "", error: "", meta: null },
            i2iJob: { loading: false, image: "", assetId: "", groupId: "", error: "", meta: null },
            sheetsJob: { loading: false, images: { instruction_1: "" }, assetGroupId: "", assetIds: { instruction_1: "" }, error: "", jobId: "", qa: null },
            storyboardJob: { promptsLoading: false, generateLoading: false, promptText: "", storyboardImage: "", error: "" },
            scriptJob: { loading: false, output: "", error: "" },
            longCombineJob: { loading: false, url: "", error: "" },
            longCombinedAssetId: "",
            longShots: [
              { label: "SHOT A", videoAssetId: "", generatedPrompt: "", lastFrameUrl: "", variants: [], selectedVariant: 0, loading: false, error: "", videoUrl: "" },
              { label: "SHOT B", videoAssetId: "", generatedPrompt: "", lastFrameUrl: "", variants: [], selectedVariant: 0, loading: false, error: "", videoUrl: "" },
            ],
          };
        }

        // Projects state. The list is owned by the server (outputs/projects.json)
        // and fetched on mount; localStorage is only a read fallback for the
        // one-time migration and for when the server cannot be reached.
        const [projects, setProjects] = useState([]);
        const [projectsLoaded, setProjectsLoaded] = useState(false);
        const [projectsSaveError, setProjectsSaveError] = useState("");
        const [activeProjectId, setActiveProjectId] = useState(null);
        const projectDraftLoadedRef = useRef(false);
        const activeProjectIdRef = useRef(null);
        useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);

        // Load the project list from the server, and migrate a browser that
        // still has its projects in localStorage on the first run. Nothing is
        // saved back until this has resolved, so a slow or failed load can
        // never overwrite the stored list with an empty one.
        useEffect(() => {
          let cancelled = false;
          const readLocalProjects = () => {
            try { return JSON.parse(localStorage.getItem("cc_projects") || "[]"); } catch (e) { return []; }
          };
          (async () => {
            try {
              const res = await fetch("/api/projects/load", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to load projects");
              if (cancelled) return;
              const serverProjects = Array.isArray(data.projects) ? data.projects : [];
              // Adopt this browser's projects whenever the server has none —
              // covers both a first run (no file yet) and a file that exists
              // but is empty. A non-empty server list always wins.
              if (!serverProjects.length) {
                const local = readLocalProjects();
                if (local.length) {
                  setProjects(local);
                  setProjectsLoaded(true);
                  return;
                }
              }
              setProjects(serverProjects);
            } catch (e) {
              // Server unreachable: fall back to whatever this browser still
              // holds rather than showing an empty workspace.
              if (!cancelled) {
                setProjects(readLocalProjects());
                setProjectsSaveError("Could not reach the server — showing this browser's last copy. Changes are not being saved.");
              }
            } finally {
              if (!cancelled) setProjectsLoaded(true);
            }
          })();
          return () => { cancelled = true; };
        }, []);

        // Dev-content sync: /files/cc_projects_seed.json optionally carries a
        // {version, projects} envelope. Whenever its version differs from
        // the version this browser last applied (cc_projects_seed_version),
        // replace all projects with the seed's — this is how updated sample
        // content (re-generated videos, new projects, "scrap and rebuild")
        // rolls out to every browser on the very next reload, with no manual
        // console/URL step. Bump the version in the seed file each time its
        // content changes. If the seed file is missing/old-format/absent,
        // this is a silent no-op and existing projects are left untouched.
        useEffect(() => {
          // Only after the server's list is in hand, so the seed cannot be
          // applied and then immediately overwritten by the load.
          if (!projectsLoaded) return;
          fetch("/files/cc_projects_seed.json")
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((seed) => {
              if (!seed || typeof seed !== "object" || !Array.isArray(seed.projects)) return;
              const appliedVersion = localStorage.getItem("cc_projects_seed_version");
              if (String(seed.version) === appliedVersion) return;
              setProjects(seed.projects);
              try {
                localStorage.setItem("cc_projects", JSON.stringify(seed.projects));
                localStorage.setItem("cc_projects_seed_version", String(seed.version));
              } catch (e) {}
            })
            .catch(() => { /* seed file not present — nothing to sync */ });
        }, [projectsLoaded]);
        // One-time skills migration: skills used to be all ticked by default and
        // ignored; now ticked skills are sent to the prompt writer. A selection
        // that is exactly the old "everything for this type" default is cleared
        // (Seedance 2.5 only); hand-edited selections are kept. Flagged per
        // project so it runs once and survives reloads.
        useEffect(() => {
          if (!projectsLoaded) return;
          setProjects((prev) => {
            if (!prev.some((p) => !p.skillsOptIn)) return prev;
            return prev.map((p) => {
              if (p.skillsOptIn) return p;
              const defaults = skillsForProjectType(p.type).map((sk) => sk.id);
              const current = p.skills || [];
              const isOldDefault = current.length === defaults.length && defaults.every((id) => current.includes(id));
              return { ...p, skills: isOldDefault ? [] : current, skillsOptIn: true };
            });
          });
        }, [projectsLoaded, projects.length]);

        const [showNewProjectModal, setShowNewProjectModal] = useState(false);
        // Projects list search / filter / sort, remembered per browser.
        const [projectFilter, setProjectFilter] = useState(() => {
          const fallback = { query: "", type: "all", sort: "newest" };
          try { return { ...fallback, ...(JSON.parse(localStorage.getItem("cc_project_filter") || "null") || {}) }; } catch (e) { return fallback; }
        });
        useEffect(() => {
          try { localStorage.setItem("cc_project_filter", JSON.stringify(projectFilter)); } catch (e) {}
        }, [projectFilter]);
        const [newProjectName, setNewProjectName] = useState("");
        const [newProjectType, setNewProjectType] = useState("short-drama");
        const [newGroupName, setNewGroupName] = useState("");
        const [addingGroupForProjectId, setAddingGroupForProjectId] = useState(null);
        const [editingProjectSkills, setEditingProjectSkills] = useState(false);
        const [creatingGroupForProjectId, setCreatingGroupForProjectId] = useState(null);
        const [projectAssetGroupError, setProjectAssetGroupError] = useState("");
        const [projectLocalFiles, setProjectLocalFiles] = useState({});
        const [projectLocalFilesLoading, setProjectLocalFilesLoading] = useState(false);
        const [projectLocalFilesError, setProjectLocalFilesError] = useState("");
        const [activeProjectTool, setActiveProjectTool] = useState("");
        const [assetPickerOpen, setAssetPickerOpen] = useState(false);
        const [assetPickerTarget, setAssetPickerTarget] = useState(null);
        const [assetPickerSelected, setAssetPickerSelected] = useState({});

        const previews = useMemo(() => {
          return files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
        }, [files]);

        function toggleProjectSkill(projectId, id) {
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            const current = p.skills || [];
            const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
            return { ...p, skills: next };
          }));
        }


        // Seed Audio state for the sidebar tool (browser-local; clips and
        // results are /files/ URLs, so this stays small). Inside a "seed-audio"
        // project the same panel reads/writes project.results.seedAudio instead.
        const [seedAudioLocal, setSeedAudioLocal] = useState(() => {
          try { return JSON.parse(localStorage.getItem("cc_seed_audio") || "null") || defaultSeedAudioState(); } catch (e) { return defaultSeedAudioState(); }
        });
        useEffect(() => {
          try { localStorage.setItem("cc_seed_audio", JSON.stringify(seedAudioLocal)); } catch (e) {}
        }, [seedAudioLocal]);

        // Seedream 5.0 tools (static/seedream-studio.jsx): browser-local state for
        // the sidebar tools, project.results.<seedreamImage|seedreamLayers|seedreamEdit> in projects.
        const [seedreamLocal, setSeedreamLocal] = useState(() => {
          try { return JSON.parse(localStorage.getItem("cc_seedream") || "null") || {}; } catch (e) { return {}; }
        });
        useEffect(() => {
          try { localStorage.setItem("cc_seedream", JSON.stringify(seedreamLocal)); } catch (e) {}
        }, [seedreamLocal]);
        const [seedAudioModel, setSeedAudioModel] = useState(() => { try { return localStorage.getItem("cc_seed_audio_model") || "1.0"; } catch (e) { return "1.0"; } });
        useEffect(() => { try { localStorage.setItem("cc_seed_audio_model", seedAudioModel); } catch (e) {} }, [seedAudioModel]);
        const seedAudioModelPicker = (
          <div style={{ marginBottom: 12 }}>
            <div className="field-label">Model</div>
            <select className="select-input" value={seedAudioModel} onChange={(e) => setSeedAudioModel(e.target.value)} aria-label="Seed Audio model">
              <option value="1.5">Seed Audio 1.5</option>
              <option value="1.0">Seed Audio 1.0</option>
            </select>
          </div>
        );

        function seedreamUpdater(stateKey) {
          if (activeSection === "projects" && activeProjectId) {
            const projectId = activeProjectId;
            return (fn) => setProjects((prev) => prev.map((p) => {
              if (p.id !== projectId) return p;
              const prevResults = p.results || {};
              return { ...p, results: { ...prevResults, [stateKey]: fn(prevResults[stateKey]) } };
            }));
          }
          const epoch = localClearEpochs[stateKey] || 0;
          return (fn) => {
            // Work started before "Clear" (a generation still running) must not refill the cleared tool.
            if ((localClearEpochsRef.current[stateKey] || 0) !== epoch) return;
            setSeedreamLocal((prev) => ({ ...prev, [stateKey]: fn(prev[stateKey]) }));
          };
        }

        // Main-dashboard "Clear": drops a tool's saved local state and remounts it empty.
        // Project copies are untouched (they live in the project, not in cc_seedream).
        const [localClearEpochs, setLocalClearEpochs] = useState({});
        const localClearEpochsRef = useRef(localClearEpochs);
        localClearEpochsRef.current = localClearEpochs;
        // Tools whose dashboard state is not in cc_seedream reset their own store instead.
        const LOCAL_TOOL_RESETS = {
          seedAudio: () => setSeedAudioLocal(defaultSeedAudioState()),
          blender3d: () => setBlenderLocal(defaultBlenderState()),
          // These two keep their state in their own localStorage keys and read them on mount.
          motionBlockout: () => { try { localStorage.removeItem("cc_motion_blockout_v1"); } catch (e) {} },
          videoEnhancer: () => { try { localStorage.removeItem("cc_video_enhancer_runs_v1"); localStorage.removeItem("cc_video_enhancer_form_v1"); } catch (e) {} },
        };
        function clearLocalTool(stateKey, label) {
          if (!window.confirm(`Clear ${label}? This removes its inputs and results from this dashboard (projects are not affected). Any generation still running here is discarded; files already saved to outputs/ stay.`)) return;
          const next = { ...localClearEpochsRef.current, [stateKey]: (localClearEpochsRef.current[stateKey] || 0) + 1 };
          localClearEpochsRef.current = next;
          if (LOCAL_TOOL_RESETS[stateKey]) LOCAL_TOOL_RESETS[stateKey]();
          else setSeedreamLocal((prev) => { const copy = { ...prev }; delete copy[stateKey]; return copy; });
          setLocalClearEpochs(next);
        }
        // A dashboard setter that ignores writes from work started before the tool was cleared.
        function guardedLocal(stateKey, setter) {
          const epoch = localClearEpochs[stateKey] || 0;
          return (fn) => {
            if ((localClearEpochsRef.current[stateKey] || 0) !== epoch) return;
            setter(fn);
          };
        }
        // React key for a dashboard tool: changes on Clear so the tool remounts empty.
        const localKey = (base, stateKey) => `${base}-local-${localClearEpochs[stateKey] || 0}`;
        const localToolHeading = (label, stateKey) => (
          <div className="tool-heading tool-heading-row">
            <span>{label}</span>
            <button type="button" className="btn-ghost tool-clear-btn" title={`Clear ${label}: remove its inputs and results from this dashboard`}
                    onClick={() => clearLocalTool(stateKey, label)}>Clear</button>
          </div>
        );

        // "Send to …" buttons inside the Seedream tools ask for another tool to open.
        const seedreamOpenRef = useRef(null);
        seedreamOpenRef.current = (tool) => {
          const key = { image: "seedream-image", layers: "seedream-layers", edit: "seedream-edit" }[tool];
          if (!key) return;
          if (activeSection === "projects" && activeProjectId) {
            setActiveProjectTool(key);
            markProjectToolUsed(key);
          } else {
            setActiveSection(key);
          }
        };
        useEffect(() => {
          const onOpen = (e) => seedreamOpenRef.current && seedreamOpenRef.current(e.detail && e.detail.tool);
          window.addEventListener("seedream-open", onOpen);
          return () => window.removeEventListener("seedream-open", onOpen);
        }, []);

        // Blender 3D state: browser-local for the sidebar tool, project.results.blender3d in projects.
        const [blenderLocal, setBlenderLocal] = useState(() => {
          try { return JSON.parse(localStorage.getItem("cc_blender3d") || "null") || defaultBlenderState(); } catch (e) { return defaultBlenderState(); }
        });
        useEffect(() => {
          try { localStorage.setItem("cc_blender3d", JSON.stringify(blenderLocal)); } catch (e) {}
        }, [blenderLocal]);

        function updateProjectBlender(projectId, fn) {
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            const prevResults = p.results || {};
            return { ...p, results: { ...prevResults, blender3d: fn(prevResults.blender3d) } };
          }));
        }

        // Opens a tool by key: inside the active project as a project tool, otherwise the sidebar section.
        function openToolByKey(key) {
          if (activeSection === "projects" && activeProjectId) {
            setActiveProjectTool(key);
            markProjectToolUsed(key);
          } else {
            setActiveSection(key);
          }
        }
        // Visual Understanding "Video → video prompt": one shot goes to Video Generation, several to
        // Long Duration (one per shot), with the model the prompt was written for.
        function sendVideoUnderstandingPrompt(target, shots, modelId) {
          if (target === "video") {
            const shot = shots[0] || {};
            const clamped = clampVideoSettingsToModel(modelId, videoResolution, shot.seconds || videoDuration);
            setVideoPrompt(shot.body || "");
            setVideoModel(modelId);
            setVideoResolution(clamped.resolution);
            setVideoDuration(clamped.duration);
            setVideoSmartLength(false);
            openToolByKey("video-generation");
            return;
          }
          const clamped = clampVideoSettingsToModel(modelId, longResolution, longDuration, MIN_LONG_DURATION);
          setLongModel(modelId);
          setLongResolution(clamped.resolution);
          shots.forEach((shot, i) => fillLongShotPromptFromScript(i, shot.body));
          openToolByKey("long-duration");
        }
        const [canvasTool, setCanvasTool] = useState("");
        useEffect(() => { setCanvasTool(""); }, [activeSection]);
        const openToolRef = useRef(null);
        openToolRef.current = openToolByKey;

        // Blender clip -> Video Generation (sendBlenderClipToVideo): the clip is added as a
        // reference video, its start frame as a reference image, and the workflow's Seedance
        // prompt template fills the prompt when it is empty.
        const blenderToVideoRef = useRef(null);
        blenderToVideoRef.current = async ({ videoUrl, posterUrl, name, prompt }) => {
          if (!videoUrl) throw new Error("This clip has no video yet.");
          const res = await fetch(videoUrl);
          if (!res.ok) throw new Error(`Could not load the clip (HTTP ${res.status}).`);
          const blob = await res.blob();
          const file = new File([blob], `${name || "blender"}.mp4`, { type: blob.type || "video/mp4" });
          const duration = await getMediaDurationSeconds(file).catch(() => null);
          const dataUrl = await readFileAsDataUrl(file);
          setVideoRefVideos((prev) => [...(prev || []), { name: file.name, dataUrl, duration }]);
          if (posterUrl) {
            const pres = await fetch(posterUrl);
            if (pres.ok) {
              const pblob = await pres.blob();
              const items = await loadReferenceImagesForProject([new File([pblob], `${name || "blender"}-start.png`, { type: pblob.type || "image/png" })], "video-ref");
              setVideoExtraRefImages((prev) => [...(prev || []), ...items]);
            }
          }
          if (prompt) setVideoPrompt((prev) => ((prev || "").trim() ? prev : prompt));
          openToolByKey("video-generation");
        };
        // "Send to Video Generation" from the film tools (Previz, Masking,
        // Location Variations): images become reference images, a video becomes a reference
        // video, and the prompt replaces the current one.
        const sendToVideoRef = useRef(null);
        sendToVideoRef.current = async ({ prompt, images, video, name }) => {
          const files = [];
          for (let i = 0; i < (images || []).length; i += 1) {
            const res = await fetch(images[i]);
            if (!res.ok) throw new Error(`Could not load an image (HTTP ${res.status}).`);
            const blob = await res.blob();
            files.push(new File([blob], `${name || "ref"}-${i + 1}.png`, { type: blob.type || "image/png" }));
          }
          if (files.length) {
            const items = await loadReferenceImagesForProject(files, "video-ref");
            setVideoExtraRefImages((prev) => [...(prev || []), ...items]);
          }
          if (video) {
            const res = await fetch(video);
            if (!res.ok) throw new Error(`Could not load the video (HTTP ${res.status}).`);
            const blob = await res.blob();
            const file = new File([blob], `${name || "clip"}.mp4`, { type: blob.type || "video/mp4" });
            const duration = await getMediaDurationSeconds(file).catch(() => null);
            const dataUrl = await readFileAsDataUrl(file);
            setVideoRefVideos((prev) => [...(prev || []), { name: file.name, dataUrl, duration }]);
          }
          if (prompt) setVideoPrompt(prompt);
          openToolByKey("video-generation");
        };
        useEffect(() => {
          const onSendFilm = (e) => {
            const d = e.detail || {};
            Promise.resolve(sendToVideoRef.current && sendToVideoRef.current(d)).then(() => d.done && d.done(), (err) => d.done && d.done(err));
          };
          window.addEventListener("cc-send-to-video", onSendFilm);
          return () => window.removeEventListener("cc-send-to-video", onSendFilm);
        }, []);
        useEffect(() => {
          const onSend = (e) => {
            const d = e.detail || {};
            Promise.resolve(blenderToVideoRef.current && blenderToVideoRef.current(d)).then(() => d.done && d.done(), (err) => d.done && d.done(err));
          };
          window.addEventListener("cc-blender-to-video", onSend);
          return () => window.removeEventListener("cc-blender-to-video", onSend);
        }, []);

        function updateProjectSeedAudio(projectId, fn) {
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            const prevResults = p.results || {};
            return { ...p, results: { ...prevResults, seedAudio: fn(prevResults.seedAudio) } };
          }));
        }

        useEffect(() => {
          (async () => {
            try {
              const res = await fetch("/api/system/capabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              const data = await res.json();
              if (res.ok) {
                setFfmpegAvailable(!!data.ffmpeg);
                setSkeletonAvailable(!!data.skeleton);
                setModelInfo(data.models || null);
              }
            } catch (e) {}
          })();
        }, []);

        useEffect(() => {
          if (activeSection !== "projects" || !activeProjectId) {
            projectDraftLoadedRef.current = false;
            return;
          }
          const project = projects.find((p) => p.id === activeProjectId);
          if (!project) return;
          const drafts = { ...defaultProjectDrafts(), ...(project.drafts || {}) };
          const results = { ...defaultProjectResults(), ...(project.results || {}) };
          setCharGenTab(drafts.charGenTab || "t2i");
          setT2iPrompt(drafts.t2iPrompt || "");
          setI2iPrompt(drafts.i2iPrompt || "");
          setScriptSourceText(drafts.scriptSourceText || "");
          setWbScript(drafts.wbScript || "");
          setWbSubject(drafts.wbSubject || "");
          setWbAction(drafts.wbAction || "");
          setWbEnvironment(drafts.wbEnvironment || "");
          setWbLighting(drafts.wbLighting || "");
          setWbCamera(drafts.wbCamera || "");
          setWbStyle(drafts.wbStyle || "");
          setWbQuality(drafts.wbQuality || "");
          setWbPromptText(drafts.wbPromptText || "");
          setVideoPrompt(drafts.videoPrompt || "");
          setLongSeed(Number.isFinite(Number(drafts.longSeed)) ? Number(drafts.longSeed) : -1);
          setLongShots((prev) => prev.map((shot, idx) => {
            const saved = (drafts.longShots || []).find((item) => item.label === shot.label) || drafts.longShots?.[idx] || {};
            const defaultShotJob = defaultProjectResults().longShots[0];
            const savedResult = { ...defaultShotJob, ...((results.longShots || []).find((item) => item.label === shot.label) || results.longShots?.[idx] || {}) };
            return {
              ...shot,
              prompt: saved.prompt || "",
              refImages: saved.refImages || [],
              refAudios: saved.refAudios || [],
              refVideos: saved.refVideos || [],
              poolKeys: Array.isArray(saved.poolKeys) ? saved.poolKeys : null,
              refRoles: saved.refRoles || "",
              refRolesAuto: saved.refRolesAuto || "",
              scriptPrompt: saved.scriptPrompt || "",
              duration: Number(saved.duration) || 0,
              videoUrl: savedResult.videoUrl || getProjectAssetUrl(project, savedResult.videoAssetId || ""),
              generatedPrompt: savedResult.generatedPrompt || "",
              lastFrameUrl: savedResult.lastFrameUrl || "",
              variants: Array.isArray(savedResult.variants) ? savedResult.variants : [],
              selectedVariant: Number(savedResult.selectedVariant) || 0,
              loading: !!savedResult.loading,
              error: savedResult.error || "",
              textOverlay: { ...defaultTextOverlayState(), ...(savedResult.textOverlay || {}) },
            };
          }));
          // Video Generation reference uploads / output params — project-scoped.
          setVideoExtraRefImages(drafts.videoExtraRefImages || []);
          setVideoAudioRefs(drafts.videoAudioRefs || []);
          setVideoRefVideos(drafts.videoRefVideos || []);
          setUseVideoRefVideosForShotA(!!drafts.useVideoRefVideosForShotA);
          setVideoRatio(drafts.videoRatio || "16:9");
          setVideoSmartLength(!!drafts.videoSmartLength);
          setVideoAutoTextOverlays(drafts.videoAutoTextOverlays !== false);
          setLongAutoTextOverlays(drafts.longAutoTextOverlays !== false);
          setVideoFps(24);
          // Resolution/duration are model-constrained, so a draft saved before
          // the model was picked (or under a different model) is pulled back
          // into range rather than restored into a combination the API rejects.
          {
            const modelId = getVideoModelSpec(drafts.videoModel).id;
            const clamped = clampVideoSettingsToModel(
              modelId,
              drafts.videoResolution || "720p",
              Number.isFinite(Number(drafts.videoDuration)) ? Number(drafts.videoDuration) : 11,
            );
            setVideoModel(modelId);
            setVideoResolution(clamped.resolution);
            setVideoDuration(clamped.duration);
          }
          setVideoClones((drafts.videoClones || []).map((saved) => {
            const clone = { ...defaultVideoClone(), ...saved };
            const modelId = getVideoModelSpec(clone.model).id;
            const clamped = clampVideoSettingsToModel(modelId, clone.resolution, clone.duration);
            return { ...clone, model: modelId, resolution: clamped.resolution, duration: clamped.duration };
          }));
          // Long Duration output params / seed video / linked refs — project-scoped.
          setLongRatio(drafts.longRatio || "16:9");
          // 24fps is the only rate the video API accepts, so drafts still
          // carrying 30/60 from the old dropdown are normalised on load.
          setLongFps(24);
          {
            const modelId = getVideoModelSpec(drafts.longModel).id;
            const clamped = clampVideoSettingsToModel(
              modelId,
              drafts.longResolution || "720p",
              Number.isFinite(Number(drafts.longDuration)) ? Number(drafts.longDuration) : 11,
              MIN_LONG_DURATION,
            );
            setLongModel(modelId);
            setLongResolution(clamped.resolution);
            setLongDuration(clamped.duration);
          }
          setLongExtraRefImages(drafts.longExtraRefImages || []);
          setLongLinkedSheetRefs(drafts.longLinkedSheetRefs || []);
          setShotASeedVideoDataUrl(drafts.shotASeedVideoDataUrl || "");
          setShotASeedVideoName(drafts.shotASeedVideoName || "");
          setShotASeedVideoAssetId(drafts.shotASeedVideoAssetId || "");
          setShotASeedVideoAssetUrl(drafts.shotASeedVideoAssetUrl || "");
          setShotASeedSource(drafts.shotASeedSource || "");
          setShotASeedSourceUrl(drafts.shotASeedSourceUrl || "");
          setShotASeedError("");
          {
            const t2iJob = { ...defaultProjectResults().t2iJob, ...(results.t2iJob || {}) };
            setT2iImage(t2iJob.image || getProjectAssetUrl(project, results.t2iAssetId || ""));
            setT2iAssetId(t2iJob.assetId || results.t2iAssetId || "");
            setT2iGroupId(t2iJob.groupId || "");
            setT2iLoading(!!t2iJob.loading);
            setT2iError(t2iJob.error || "");
            setT2iMeta(t2iJob.meta || null);
          }
          {
            const i2iJob = { ...defaultProjectResults().i2iJob, ...(results.i2iJob || {}) };
            setI2iImage(i2iJob.image || getProjectAssetUrl(project, results.i2iAssetId || ""));
            setI2iAssetId(i2iJob.assetId || results.i2iAssetId || "");
            setI2iGroupId(i2iJob.groupId || "");
            setI2iLoading(!!i2iJob.loading);
            setI2iError(i2iJob.error || "");
            setI2iMeta(i2iJob.meta || null);
          }
          {
            const scriptJob = { ...defaultProjectResults().scriptJob, ...(results.scriptJob || {}) };
            setScriptPromptOutput(scriptJob.output || results.scriptPromptOutput || "");
            setScriptPromptLoading(!!scriptJob.loading);
            setScriptPromptError(scriptJob.error || "");
          }
          {
            const sheetsJob = { ...defaultProjectResults().sheetsJob, ...(results.sheetsJob || {}) };
            const hasSheetsJobImage = !!sheetsJob.images?.instruction_1;
            setImages({
              instruction_1: hasSheetsJobImage
                ? sheetsJob.images.instruction_1
                : getProjectAssetUrl(project, results.images?.instruction_1 || ""),
            });
            setAssetIds(sheetsJob.assetIds || { instruction_1: "" });
            setAssetGroupId(sheetsJob.assetGroupId || "");
            setLoading(!!sheetsJob.loading);
            setError(sheetsJob.error || "");
            setSheetQa(sheetsJob.qa || null);
            setSheetQaView(null);
          }
          {
            const storyboardJob = { ...defaultProjectResults().storyboardJob, ...(results.storyboardJob || {}) };
            setWbPromptText(storyboardJob.promptText || drafts.wbPromptText || "");
            setWbStoryboardImage(storyboardJob.storyboardImage || getProjectAssetUrl(project, results.wbStoryboardAssetId || ""));
            setWbPromptsLoading(!!storyboardJob.promptsLoading);
            setWbGenerateLoading(!!storyboardJob.generateLoading);
            setWbError(storyboardJob.error || "");
          }
          {
            const videoJob = { ...defaultProjectResults().videoJob, ...(results.videoJob || {}) };
            setVideoUrl(videoJob.url || getProjectAssetUrl(project, results.videoAssetId || ""));
            setVideoGeneratedPrompt(videoJob.generatedPrompt || results.videoGeneratedPrompt || "");
            setVideoVariants(Array.isArray(videoJob.variants) ? videoJob.variants : []);
            setVideoSelectedVariant(Number(videoJob.selectedVariant) || 0);
            setVideoLoading(!!videoJob.loading);
            setVideoError(videoJob.error || "");
            setVideoTextOverlay({ ...defaultTextOverlayState(), ...(videoJob.textOverlay || {}) });
          }
          {
            const longCombineJob = { ...defaultProjectResults().longCombineJob, ...(results.longCombineJob || {}) };
            setLongCombinedUrl(longCombineJob.url || getProjectAssetUrl(project, results.longCombinedAssetId || ""));
            setLongCombineLoading(!!longCombineJob.loading);
            setLongCombineError(longCombineJob.error || "");
          }
          projectDraftLoadedRef.current = true;
        }, [activeProjectId, activeSection]);

        useEffect(() => {
          if (activeSection !== "projects" || !activeProjectId) return;
          refreshProjectLocalFiles(activeProjectId);
        }, [activeProjectId, activeSection]);

        useEffect(() => {
          if (activeSection !== "projects" || !activeProjectId || !projectDraftLoadedRef.current) return;
          setProjects((prev) => prev.map((project) => {
            if (project.id !== activeProjectId) return project;
            return {
              ...project,
              drafts: {
                ...defaultProjectDrafts(),
                charGenTab,
                t2iPrompt,
                i2iPrompt,
                scriptSourceText,
                wbScript,
                wbSubject,
                wbAction,
                wbEnvironment,
                wbLighting,
                wbCamera,
                wbStyle,
                wbQuality,
                wbPromptText,
                videoPrompt,
                videoExtraRefImages,
                videoAudioRefs,
                videoRefVideos,
                useVideoRefVideosForShotA,
                videoResolution,
                videoRatio,
                videoDuration,
                videoSmartLength,
                videoFps,
                videoModel,
                videoClones,
                videoAutoTextOverlays,
                longAutoTextOverlays,
                longResolution,
                longRatio,
                longFps,
                longDuration,
                longSeed,
                longModel,
                longExtraRefImages,
                shotASeedVideoDataUrl,
                shotASeedVideoName,
                shotASeedVideoAssetId,
                shotASeedVideoAssetUrl,
                shotASeedSource,
                shotASeedSourceUrl,
                longShots: longShots.map((shot) => ({
                  label: shot.label,
                  prompt: shot.prompt || "",
                  refImages: shot.refImages || [],
                  refAudios: shot.refAudios || [],
                  refVideos: shot.refVideos || [],
                  poolKeys: Array.isArray(shot.poolKeys) ? shot.poolKeys : null,
                  refRoles: shot.refRoles || "",
                  refRolesAuto: shot.refRolesAuto || "",
                  scriptPrompt: shot.scriptPrompt || "",
                  duration: Number(shot.duration) || 0,
                })),
                longLinkedSheetRefs,
              },
            };
          }));
        }, [activeSection, activeProjectId, charGenTab, t2iPrompt, i2iPrompt, scriptSourceText, wbScript, wbSubject, wbAction, wbEnvironment, wbLighting, wbCamera, wbStyle, wbQuality, wbPromptText, videoPrompt, videoExtraRefImages, videoAudioRefs, videoRefVideos, useVideoRefVideosForShotA, videoResolution, videoRatio, videoDuration, videoSmartLength, videoFps, videoModel, videoClones, videoAutoTextOverlays, longAutoTextOverlays, longResolution, longRatio, longFps, longDuration, longSeed, longModel, longExtraRefImages, longLinkedSheetRefs, shotASeedVideoDataUrl, shotASeedVideoName, shotASeedVideoAssetId, shotASeedVideoAssetUrl, shotASeedSource, shotASeedSourceUrl, longShots]);

        // Note: scriptPromptOutput and longShots' generated results used to be synced
        // to the active project here on every change. Both are now owned by their
        // respective job writers (applyProjectJobUpdate's scriptJob, and
        // applyLongShotUpdate) so they persist correctly even when the user has
        // switched away from this project mid-generation — see those functions.

        useEffect(() => {
          if (!useVideoRefVideosForShotA) {
            if (shotASeedSource === "video_generated") {
              setShotASeedError("");
              setShotASeedVideoName("");
              setShotASeedVideoDataUrl("");
              setShotASeedVideoAssetId("");
              setShotASeedVideoAssetUrl("");
              setShotASeedSource("");
              setShotASeedSourceUrl("");
            }
            return;
          }
          if (!videoUrl) {
            setUseVideoRefVideosForShotA(false);
            return;
          }
          if (shotASeedSource === "video_generated" && shotASeedSourceUrl === videoUrl) return;

          setShotASeedError("");
          setShotASeedVideoName("Generated video");
          setShotASeedVideoDataUrl("");
          setShotASeedVideoAssetId("");
          setShotASeedVideoAssetUrl("");
          setShotASeedSource("video_generated");
          setShotASeedSourceUrl(videoUrl);
        }, [useVideoRefVideosForShotA, videoUrl, shotASeedSource, shotASeedSourceUrl]);

        useEffect(() => {
          if (useT2IForWb && t2iImage) {
            upsertWbLinkedRefs("wb-t2i", [{ name: "Character generated (T2I)", dataUrl: t2iImage }]);
          }
          if (!useT2IForWb) {
            removeWbLinkedRefs("wb-t2i");
          }
        }, [useT2IForWb, t2iImage]);

        useEffect(() => {
          if (useI2IForWb && i2iImage) {
            upsertWbLinkedRefs("wb-i2i", [{ name: "Character generated (I2I)", dataUrl: i2iImage }]);
          }
          if (!useI2IForWb) {
            removeWbLinkedRefs("wb-i2i");
          }
        }, [useI2IForWb, i2iImage]);

        useEffect(() => {
          if (useSheetsInWb) {
            const refs = [];
            if (images.instruction_1 && sheetSelections.instruction_1) refs.push({ name: "Character sheet", dataUrl: images.instruction_1 });
            upsertWbLinkedRefs("wb-sheet", refs);
          } else {
            removeWbLinkedRefs("wb-sheet");
          }
        }, [useSheetsInWb, images.instruction_1, sheetSelections.instruction_1]);

        useEffect(() => {
          if (useWbStoryboardForVideo && wbStoryboardImage) {
            upsertVideoLinkedRefs("wb-storyboard", [{ name: "Storyboard sheet", dataUrl: wbStoryboardImage }]);
          } else {
            removeVideoLinkedRefs("wb-storyboard");
          }
        }, [useWbStoryboardForVideo, wbStoryboardImage]);

        useEffect(() => {
          if (useWbStoryboardForLong && wbStoryboardImage) {
            upsertLongLinkedRefs("wb-storyboard", [{ name: "Storyboard sheet", dataUrl: wbStoryboardImage }]);
          } else {
            removeLongLinkedRefs("wb-storyboard");
          }
        }, [useWbStoryboardForLong, wbStoryboardImage]);

        useEffect(() => {
          return () => {
            for (const p of previews) URL.revokeObjectURL(p.url);
          };
        }, [previews]);

        useEffect(() => {
          function onKeyDown(e) {
            if (e.key === "Escape") setModalImageUrl("");
          }
          window.addEventListener("keydown", onKeyDown);
          return () => window.removeEventListener("keydown", onKeyDown);
        }, []);

        async function setFilesFromFileList(fileList) {
          const raw = Array.from(fileList || []);
          const next = raw.slice(0, 9);
          if (raw.length > 9) {
            setError("Max 9 reference images allowed. Extra files were ignored.");
          }
          if (activeSection === "projects" && activeProjectId && next.length) {
            await loadReferenceImagesForProject(next, "sheet-ref");
          }
          setFiles(next);
        }

        function onClear() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          applyProjectJobUpdate(jobProjectId, "sheetsJob", { loading: false, images: { instruction_1: "" }, assetGroupId: "", assetIds: { instruction_1: "" }, error: "", jobId: "", qa: null }, { loading: setLoading, images: setImages, assetGroupId: setAssetGroupId, assetIds: setAssetIds, error: setError, qa: setSheetQa });
          setSheetQaView(null);
          setSheetNotes("");
          setFiles([]);
          setSheetSelections({ instruction_1: true });
          setUseSheetsInVideo(false);
          setUseSheetsInLong(false);
          setUseSheetsInWb(false);
          setLongLinkedSheetRefs([]);
          setT2iPrompt("");
          applyProjectJobUpdate(jobProjectId, "t2iJob", { loading: false, image: "", assetId: "", groupId: "", error: "", meta: null }, { loading: setT2iLoading, image: setT2iImage, assetId: setT2iAssetId, groupId: setT2iGroupId, error: setT2iError, meta: setT2iMeta });
          setUseT2IForSheets(true);
          setUseT2IForVideoAll(false);
          setUseT2IForWb(false);
          setI2iSourceImages([]);
          setI2iPrompt("");
          applyProjectJobUpdate(jobProjectId, "i2iJob", { loading: false, image: "", assetId: "", groupId: "", error: "", meta: null }, { loading: setI2iLoading, image: setI2iImage, assetId: setI2iAssetId, groupId: setI2iGroupId, error: setI2iError, meta: setI2iMeta });
          setUseI2IForSheets(false);
          setUseI2IForVideoAll(false);
          setUseI2IForWb(false);
          setCharGenTab("t2i");
          setVideoPrompt("");
          setVideoDraftTaskId("");
          setVideoExtraRefImages([]);
          setLongExtraRefImages([]);
          setVideoRefUploadError("");
          setVideoAudioRefs([]);
          setVideoAudioUploadError("");
          setVideoRefVideos([]);
          setVideoRefVideoUploadError("");
          setUseVideoRefVideosForShotA(false);
          setVideoResolution("720p");
          setVideoRatio("16:9");
          setVideoDuration(11);
          setVideoSmartLength(false);
          setVideoFps(24);
          setLongResolution("720p");
          setLongRatio("16:9");
          setLongFps(24);
          setLongDuration(11);
          applyVideoJobUpdate(jobProjectId, { loading: false, variants: [], selectedVariant: 0, url: "", error: "", generatedPrompt: "" });
          setLongShots([
            { label: "SHOT A", prompt: "", loading: false, variants: [], selectedVariant: 0, videoUrl: "", videoAssetId: "", videoAssetUrl: "", lastFrameUrl: "", generatedPrompt: "", error: "", refImages: [], refImageError: "", refAudios: [], refAudioError: "", refVideos: [], refVideoError: "" },
            { label: "SHOT B", prompt: "", loading: false, variants: [], selectedVariant: 0, videoUrl: "", videoAssetId: "", videoAssetUrl: "", lastFrameUrl: "", generatedPrompt: "", error: "", refImages: [], refImageError: "", refAudios: [], refAudioError: "", refVideos: [], refVideoError: "" },
          ]);
          if (jobProjectId) {
            setProjects((prev) => prev.map((p) => (p.id === jobProjectId ? { ...p, results: { ...defaultProjectResults(), ...(p.results || {}), longShots: defaultProjectResults().longShots } } : p)));
          }
          setLongExpanded({ "SHOT A": true, "SHOT B": true });
          applyProjectJobUpdate(jobProjectId, "longCombineJob", { loading: false, url: "", error: "" }, { loading: setLongCombineLoading, url: setLongCombinedUrl, error: setLongCombineError });
          setShotASeedVideoDataUrl("");
          setShotASeedVideoName("");
          setShotASeedVideoAssetId("");
          setShotASeedVideoAssetUrl("");
          setShotASeedLoading(false);
          setShotASeedError("");
          setShotASeedSource("");
          setShotASeedSourceUrl("");
          setWbRefImages([]);
          applyProjectJobUpdate(jobProjectId, "storyboardJob", { promptsLoading: false, generateLoading: false, promptText: "", storyboardImage: "", error: "" }, { promptsLoading: setWbPromptsLoading, generateLoading: setWbGenerateLoading, promptText: setWbPromptText, storyboardImage: setWbStoryboardImage, error: setWbError });
          setUseWbStoryboardForVideo(false);
          setUseWbStoryboardForLong(false);
          setScriptSourceText("");
          setScriptPdfFile(null);
          applyProjectJobUpdate(jobProjectId, "scriptJob", { loading: false, output: "", error: "" }, { loading: setScriptPromptLoading, output: setScriptPromptOutput, error: setScriptPromptError });
          setModalImageUrl("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (scriptPdfInputRef.current) scriptPdfInputRef.current.value = "";
        }

        function onClearCharacterGeneration() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          setT2iPrompt("");
          applyProjectJobUpdate(jobProjectId, "t2iJob", { loading: false, image: "", assetId: "", groupId: "", error: "", meta: null }, { loading: setT2iLoading, image: setT2iImage, assetId: setT2iAssetId, groupId: setT2iGroupId, error: setT2iError, meta: setT2iMeta });
          setUseT2IForSheets(true);
          setUseT2IForVideoAll(false);
          setUseT2IForWb(false);
          setI2iSourceImages([]);
          setI2iPrompt("");
          applyProjectJobUpdate(jobProjectId, "i2iJob", { loading: false, image: "", assetId: "", groupId: "", error: "", meta: null }, { loading: setI2iLoading, image: setI2iImage, assetId: setI2iAssetId, groupId: setI2iGroupId, error: setI2iError, meta: setI2iMeta });
          setUseI2IForSheets(false);
          setUseI2IForVideoAll(false);
          setUseI2IForWb(false);
        }

        function onClearWorldBuilding() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          setWbScript("");
          setWbSubject("");
          setWbAction("");
          setWbEnvironment("");
          setWbLighting("");
          setWbCamera("");
          setWbStyle("");
          setWbQuality("");
          setWbRefImages([]);
          setWbRefVideos([]);
          applyProjectJobUpdate(jobProjectId, "storyboardJob", { promptsLoading: false, generateLoading: false, promptText: "", storyboardImage: "", error: "" }, { promptsLoading: setWbPromptsLoading, generateLoading: setWbGenerateLoading, promptText: setWbPromptText, storyboardImage: setWbStoryboardImage, error: setWbError });
          setUseWbStoryboardForVideo(false);
          setUseWbStoryboardForLong(false);
        }

        function defaultVideoClone() {
          return {
            id: "",
            prompt: "",
            draftTaskId: "",
            draftMode: false,
            extraRefImages: [],
            refUploadError: "",
            audioRefs: [],
            audioUploadError: "",
            refVideos: [],
            refVideoUploadError: "",
            model: DEFAULT_VIDEO_MODEL_ID,
            resolution: "720p",
            ratio: "16:9",
            duration: 11,
            smartLength: false,
            fps: 24,
            outputFormat: "mp4",
            loading: false,
            variants: [],
            selectedVariant: 0,
            url: "",
            error: "",
            generatedPrompt: "",
            textOverlay: defaultTextOverlayState(),
            autoTextOverlays: true,
          };
        }

        // The "+" on the Video Generation card. It copies the panel it was
        // pressed on into a new, fully independent panel, so the same tool can
        // be run again — different model, duration or prompt tweak — without
        // overwriting the generation already on screen. Sheet-linked references
        // become plain references on the copy: sheet linking stays owned by the
        // original panel (linkSheetResultsToVideo), but the images themselves
        // are still useful to the copy.
        function duplicateVideoPanel(inst) {
          const clone = {
            ...defaultVideoClone(),
            id: genId(),
            prompt: inst.prompt || "",
            draftTaskId: inst.draftTaskId || "",
            extraRefImages: (inst.extraRefImages || []).map((x) => (x?.origin === "sheet" ? { ...x, origin: "upload" } : x)),
            audioRefs: [...(inst.audioRefs || [])],
            refVideos: [...(inst.refVideos || [])],
            model: getVideoModelSpec(inst.model).id,
            resolution: inst.resolution || "720p",
            ratio: inst.ratio || "16:9",
            duration: Number(inst.duration) || 11,
            smartLength: !!inst.smartLength,
            fps: Number(inst.fps) || 24,
            outputFormat: inst.outputFormat || "mp4",
            textOverlay: { ...defaultTextOverlayState(), ...(inst.textOverlay || {}), loading: false, error: "" },
            autoTextOverlays: inst.autoTextOverlays !== false,
          };
          setVideoClones((prev) => [...prev, clone]);
        }

        function removeVideoPanel(cloneId) {
          setVideoClones((prev) => prev.filter((c) => c.id !== cloneId));
        }

        // Pick which of a panel's parallel videos the panel points at. For the
        // original panel that is also the video handed to Long Duration Shot A,
        // so choosing here re-seeds Shot A when that link is switched on.
        function selectVideoVariant(inst, variantIndex) {
          const variant = (inst.variants || [])[variantIndex];
          if (!variant?.url) return;
          inst.set("selectedVariant", variantIndex);
          inst.set("url", variant.url);
        }

        function setVideoCloneField(cloneId, field, value) {
          setVideoClones((prev) => prev.map((clone) => (
            clone.id !== cloneId
              ? clone
              : { ...clone, [field]: typeof value === "function" ? value(clone[field]) : value }
          )));
        }

        function onClearVideoPanel(inst) {
          if (!inst.isMain) {
            inst.set("prompt", "");
            inst.set("draftTaskId", "");
            inst.set("extraRefImages", []);
            inst.set("refUploadError", "");
            inst.set("audioRefs", []);
            inst.set("audioUploadError", "");
            inst.set("refVideos", []);
            inst.set("refVideoUploadError", "");
            inst.set("resolution", "720p");
            inst.set("ratio", "16:9");
            inst.set("duration", 11);
            inst.set("smartLength", false);
            inst.set("fps", 24);
            inst.set("model", DEFAULT_VIDEO_MODEL_ID);
            inst.set("loading", false);
            inst.set("variants", []);
            inst.set("selectedVariant", 0);
            inst.set("url", "");
            inst.set("error", "");
            inst.set("generatedPrompt", "");
            inst.set("textOverlay", defaultTextOverlayState());
            return;
          }
          onClearVideoGeneration();
        }

        function onClearVideoGeneration() {
          setVideoPrompt("");
          setVideoDraftTaskId("");
          setVideoExtraRefImages([]);
          setVideoRefUploadError("");
          setVideoAudioRefs([]);
          setVideoAudioUploadError("");
          setVideoRefVideos([]);
          setVideoRefVideoUploadError("");
          setUseVideoRefVideosForShotA(false);
          setVideoResolution("720p");
          setVideoRatio("16:9");
          setVideoDuration(11);
          setVideoSmartLength(false);
          setVideoFps(24);
          setVideoModel(DEFAULT_VIDEO_MODEL_ID);
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          applyVideoJobUpdate(jobProjectId, { loading: false, variants: [], selectedVariant: 0, url: "", error: "", generatedPrompt: "", textOverlay: defaultTextOverlayState() });
        }

        function onClearScriptToPrompt() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          setScriptSourceText("");
          setScriptPdfFile(null);
          applyProjectJobUpdate(jobProjectId, "scriptJob", { loading: false, output: "", error: "" }, { loading: setScriptPromptLoading, output: setScriptPromptOutput, error: setScriptPromptError });
          if (scriptPdfInputRef.current) scriptPdfInputRef.current.value = "";
        }

        function parseScriptPromptShots(text) {
          const raw = String(text || "").replace(/\r/g, "").trim();
          if (!raw) return [];
          const normalized = raw
            .replace(/^(?:---|\*\*\*|___)\s*$/gm, "")
            .trim();
          let blocks = normalized
            .split(/(?=^(?:\s*(?:[#>*-]+\s*)?(?:\*\*)?)SHOT\s+(?:\d+|[A-Z])(?:\*\*)?\s*[:.-]?\s*$)/gim)
            .map((part) => part.trim())
            .filter(Boolean);
          if (blocks.length <= 1) {
            blocks = normalized
              .split(/(?=^(?:\s*(?:[#>*-]+\s*)?(?:\*\*)?)SCENE\s+(?:\d+|[A-Z])(?:\*\*)?\s*[:.-]?\s*$)/gim)
              .map((part) => part.trim())
              .filter(Boolean);
          }
          if (blocks.length > 1) return blocks;
          if (blocks.length === 1 && /^(?:\s*(?:[#>*-]+\s*)?(?:\*\*)?)SHOT\s+(?:\d+|[A-Z])(?:\*\*)?\s*[:.-]?\s*$/gim.test(normalized)) return blocks;
          return [raw];
        }

        // A shot's prompt without its "SHOT n" heading line.
        function scriptShotBody(shotText) {
          return String(shotText || "").replace(/^\s*(?:[#>*-]+\s*)?(?:\*\*)?SHOT\s+(?:\d+|[A-Z])(?:\*\*)?\s*[:.-]?\s*\n+/i, "").trim();
        }

        // Edits one shot in the Breakdown; the output is stored as "SHOT n" blocks again.
        function editScriptShot(index, text) {
          const shots = parseScriptPromptShots(scriptPromptOutput).map(scriptShotBody);
          shots[index] = text;
          const output = shots.map((body, i) => `SHOT ${i + 1}\n\n${body}`).join("\n\n");
          applyProjectJobUpdate(projectMode ? activeProjectId : null, "scriptJob", { output }, { output: setScriptPromptOutput });
        }

        function fillLongShotPromptFromScript(index, promptText) {
          const cleaned = String(promptText || "").trim();
          if (!cleaned) return;
          setLongShots((prev) => {
            const next = [...prev];
            while (next.length <= index) {
              next.push(newLongShot(nextShotLabel(next.length)));
            }
            // Pre-select the shared references named on the shot's "IN THIS SHOT:" line.
            const line = (cleaned.match(/IN THIS SHOT:\s*(.+)/i) || [])[1] || "";
            const names = line.split(/[,·;|]/).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 1);
            const norm = (x) => String(x || "").toLowerCase().replace(/ sheet$/, "").trim();
            const matched = names.length ? longSharedPool.filter((it) => names.some((n) => norm(it.name).includes(n) || n.includes(norm(it.name)))) : [];
            next[index] = { ...next[index], prompt: cleaned, scriptPrompt: cleaned, error: "", duration: 0, ...(matched.length ? { poolKeys: matched.map((it) => it.poolKey) } : {}) };
            return autoMapLongShots(next, longSharedPool);
          });
          setLongExpanded((prev) => {
            const next = { ...prev };
            for (let i = 0; i <= index; i += 1) {
              next[nextShotLabel(i)] = true;
            }
            return next;
          });
        }

        function onClearLongShot(index) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const label = (longShots[index] || {}).label || nextShotLabel(index);
          applyLongShotUpdate(jobProjectId, index, label, {
            ...newLongShot(label),
            label,
          });
          if (index === 0) {
            setShotASeedError("");
          }
        }

        function removeFileAt(index) {
          setFiles((prev) => prev.filter((_, i) => i !== index));
          if (fileInputRef.current) fileInputRef.current.value = "";
        }

        function openUploadDialog() {
          if (loading) return;
          if (fileInputRef.current) fileInputRef.current.click();
        }

        async function onDrop(e) {
          e.preventDefault();
          e.stopPropagation();
          if (loading) return;
          if (e.dataTransfer && e.dataTransfer.files) {
            try {
              await setFilesFromFileList(e.dataTransfer.files);
            } catch (err) {
              setError(String(err?.message || err));
            }
          }
        }

        function onDragOver(e) {
          e.preventDefault();
          e.stopPropagation();
        }

        // Saves a result as "<project name>-<model used>.<ext>" (see window.ccDownload).
        function downloadImage(url, model, fallbackExt) {
          if (!url) return;
          window.ccDownload(url, model, fallbackExt);
        }

        async function onGenerateT2I() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = { error: setT2iError, image: setT2iImage, assetId: setT2iAssetId, groupId: setT2iGroupId, loading: setT2iLoading, meta: setT2iMeta };
          applyProjectJobUpdate(jobProjectId, "t2iJob", { error: "", image: "", assetId: "", groupId: "", meta: null }, setters);

          const p = t2iPrompt.trim();
          if (!p) {
            applyProjectJobUpdate(jobProjectId, "t2iJob", { error: "Enter a text-to-image prompt." }, setters);
            return;
          }
          applyProjectJobUpdate(jobProjectId, "t2iJob", { loading: true }, setters);
          try {
            const res = await fetch("/api/t2i", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: p, engineer: charEngineer }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate character image");
            applyProjectJobUpdate(jobProjectId, "t2iJob", {
              meta: data.prompt ? { prompt: data.prompt, bible: data.bible || null } : null,
              image: data.image || "",
              assetId: data.asset?.asset_id || "",
              groupId: data.asset?.group_id || "",
            }, setters);
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "t2iJob", { error: String(e?.message || e) }, setters);
          } finally {
            applyProjectJobUpdate(jobProjectId, "t2iJob", { loading: false }, setters);
          }
        }

        function readFileAsDataUrl(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });
        }

        function convertImageFileToPngDataUrl(file) {
          return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx || !canvas.width || !canvas.height) {
                  throw new Error("Failed to create image canvas");
                }
                ctx.drawImage(img, 0, 0);
                const pngDataUrl = canvas.toDataURL("image/png");
                URL.revokeObjectURL(objectUrl);
                resolve(pngDataUrl);
              } catch (e) {
                URL.revokeObjectURL(objectUrl);
                reject(e instanceof Error ? e : new Error("Failed to convert image"));
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error("Failed to decode image"));
            };
            img.src = objectUrl;
          });
        }

        async function readCompatibleImageDataUrl(file) {
          const mime = String(file?.type || "").toLowerCase();
          if (mime === "image/webp" || mime === "image/avif") {
            return convertImageFileToPngDataUrl(file);
          }
          return readFileAsDataUrl(file);
        }

        // Best-effort, non-blocking: also drop an uploaded reference file
        // into the project's Local Folder at upload time, same as generated
        // results do via "Save locally". Never throws into the caller.
        function saveRefUploadLocally(dataUrl, name) {
          if (activeSection !== "projects" || !activeProjectId) return;
          saveGeneratedAssetToProjectFolder({ toolKey: "reference-upload", dataUrl, name: name || "reference" }).catch(() => {});
        }

        async function onUploadShotASeedVideo(file) {
          setShotASeedError("");
          setShotASeedVideoName("");
          setShotASeedVideoDataUrl("");
          setShotASeedVideoAssetId("");
          setShotASeedVideoAssetUrl("");
          setShotASeedSourceUrl("");
          if (!file) return;
          setShotASeedSource("long_upload");
          setUseVideoRefVideosForShotA(false);
          setShotASeedLoading(true);
          try {
            const dataUrl = await readFileAsDataUrl(file);
            setShotASeedVideoDataUrl(dataUrl);
            setShotASeedVideoName(file.name || "uploaded.mp4");
            saveRefUploadLocally(dataUrl, file.name || "shot-a-seed.mp4");
            const res = await fetch("/api/video/upload_asset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ video_data_url: dataUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to upload reference video to assets");
            setShotASeedVideoAssetId(data.asset_id || "");
            setShotASeedVideoAssetUrl(data.asset_url || "");
          } catch (e) {
            setShotASeedError(String(e?.message || e));
          } finally {
            setShotASeedLoading(false);
          }
        }

        function getMediaDurationSeconds(file) {
          return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const el = document.createElement((file.type || "").startsWith("audio/") ? "audio" : "video");
            const cleanup = () => {
              try { URL.revokeObjectURL(url); } catch (e) {}
              el.src = "";
            };
            el.preload = "metadata";
            el.onloadedmetadata = () => {
              const d = Number(el.duration);
              cleanup();
              if (!Number.isFinite(d) || d <= 0) {
                reject(new Error("Invalid media duration"));
                return;
              }
              resolve(d);
            };
            el.onerror = () => {
              cleanup();
              reject(new Error("Failed to read media metadata"));
            };
            el.src = url;
          });
        }

        async function addLongShotRefImages(index, fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;
          const items = await loadReferenceImagesForProject(files, `long-shot-${index + 1}-ref`);
          items.forEach((it) => saveRefUploadLocally(it.dataUrl, it.name));
          setLongShots((prev) => prev.map((s, i) => {
            if (i !== index) return s;
            const existing = s.refImages || [];
            const merged = [...existing, ...items];
            const maxImages = getVideoModelSpec(longModel).refs.images;
            if (merged.length > maxImages) {
              return { ...s, refImages: merged.slice(0, maxImages), refImageError: `Max ${maxImages} reference images per shot for this model. Extra files were ignored.` };
            }
            return { ...s, refImages: merged, refImageError: "" };
          }));
        }

        async function addLongShotRefAudios(index, fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;
          const items = [];
          for (const f of files) {
            const duration = await getMediaDurationSeconds(f);
            const dataUrl = await readFileAsDataUrl(f);
            items.push({ name: f.name, dataUrl, duration });
            saveRefUploadLocally(dataUrl, f.name);
          }
          setLongShots((prev) => prev.map((s, i) => {
            if (i !== index) return s;
            const r = getVideoModelSpec(longModel).refs;
            const capped = capReferenceMedia(s.refAudios || [], items, r.audios, r.audioSec, "audio");
            return { ...s, refAudios: capped.list, refAudioError: capped.error };
          }));
        }

        async function addLongShotRefVideos(index, fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;

          const items = [];
          for (const f of files) {
            const duration = await getMediaDurationSeconds(f);
            const dataUrl = await readFileAsDataUrl(f);
            items.push({ name: f.name, dataUrl, duration });
            saveRefUploadLocally(dataUrl, f.name);
          }

          setLongShots((prev) => prev.map((s, i) => {
            if (i !== index) return s;
            const r = getVideoModelSpec(longModel).refs;
            const capped = capReferenceMedia(s.refVideos || [], items, r.videos, r.videoSec, "video", r.videoClipSec);
            return { ...s, refVideos: capped.list, refVideoError: capped.error };
          }));
        }

        async function onPickI2ISource(fileList) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = { error: setI2iError, image: setI2iImage, assetId: setI2iAssetId, groupId: setI2iGroupId };
          applyProjectJobUpdate(jobProjectId, "i2iJob", { error: "", image: "", assetId: "", groupId: "" }, setters);
          const files = Array.from(fileList || []);
          if (!files.length) return;
          try {
            const limited = files.slice(0, 9);
            if (files.length > 9) {
              applyProjectJobUpdate(jobProjectId, "i2iJob", { error: "Max 9 reference images allowed. Extra files were ignored." }, setters);
            }
            const items = [];
            const loaded = await loadReferenceImagesForProject(limited, "i2i-ref");
            for (const it of loaded) items.push({ name: it.name, dataUrl: it.dataUrl, assetId: it.assetId || "", assetUrl: it.assetUrl || "" });
            setI2iSourceImages(items);
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "i2iJob", { error: String(e?.message || e) }, setters);
          }
        }

        async function onGenerateI2I() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = { error: setI2iError, image: setI2iImage, assetId: setI2iAssetId, groupId: setI2iGroupId, loading: setI2iLoading, meta: setI2iMeta };
          applyProjectJobUpdate(jobProjectId, "i2iJob", { error: "", image: "", assetId: "", groupId: "", meta: null }, setters);

          const p = i2iPrompt.trim();
          if (!i2iSourceImages.length) {
            applyProjectJobUpdate(jobProjectId, "i2iJob", { error: "Upload at least one source image for image-to-image." }, setters);
            return;
          }
          if (!p) {
            applyProjectJobUpdate(jobProjectId, "i2iJob", { error: "Enter an image-to-image prompt." }, setters);
            return;
          }
          applyProjectJobUpdate(jobProjectId, "i2iJob", { loading: true }, setters);
          try {
            const res = await fetch("/api/i2i", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: p, images: i2iSourceImages.map((x) => x.dataUrl), engineer: charEngineer }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate image-to-image character");
            applyProjectJobUpdate(jobProjectId, "i2iJob", {
              meta: data.prompt ? { prompt: data.prompt, bible: data.bible || null } : null,
              image: data.image || "",
              assetId: data.asset?.asset_id || "",
              groupId: data.asset?.group_id || "",
            }, setters);
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "i2iJob", { error: String(e?.message || e) }, setters);
          } finally {
            applyProjectJobUpdate(jobProjectId, "i2iJob", { loading: false }, setters);
          }
        }

        async function onGenerate() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = sheetJobSetters();
          setSheetQaView(null);
          applyProjectJobUpdate(jobProjectId, "sheetsJob", { error: "", images: { instruction_1: "" }, assetIds: { instruction_1: "" }, assetGroupId: "", jobId: "", qa: null }, setters);
          setUseSheetsInVideo(false);
          setUseSheetsInLong(false);
          applyVideoJobUpdate(jobProjectId, { loading: false, variants: [], selectedVariant: 0, url: "", error: "", generatedPrompt: "" });
          applyProjectJobUpdate(jobProjectId, "sheetsJob", { loading: true }, setters);

          try {
            const hasUploadedFiles = files.length > 0;
            const hasT2I = useT2IForSheets && !!t2iImage;
            const hasI2I = useI2IForSheets && !!i2iImage;
            if (!hasUploadedFiles && !hasT2I && !hasI2I && sheetNotes.trim().length < 3) {
              throw new Error("Upload a reference image or write a character description.");
            }
            const selectedKeys = Object.keys(sheetSelections).filter((k) => sheetSelections[k]);
            if (!selectedKeys.length) {
              throw new Error("Enable the character sheet option to generate.");
            }
            const refs = [];
            for (const f of files) refs.push(await readCompatibleImageDataUrl(f));
            if (hasT2I) refs.push(t2iImage);
            if (hasI2I) refs.push(i2iImage);
            // A bible from reference-ready Character Generation keeps the sheet faithful to it.
            const bible = (hasT2I && t2iMeta?.bible) || (hasI2I && i2iMeta?.bible) || null;
            const res = await fetch("/api/character-sheet/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: refs, notes: sheetNotes, bible }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Request failed");
            applyProjectJobUpdate(jobProjectId, "sheetsJob", { jobId: data.job_id, qa: { status: "running", stage: "Starting", steps: [], attempts: [], max_attempts: data.max_attempts } }, setters);
            pollSheetJob(jobProjectId, data.job_id);
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "sheetsJob", { error: String(e?.message || e), loading: false }, setters);
          }
        }

        useEffect(() => {
          (projects || []).forEach((p) => {
            const j = p.results && p.results.sheetsJob;
            if (j && j.loading && j.jobId) pollSheetJob(p.id, j.jobId);
          });
        }, [projects]);

        function sheetJobSetters() {
          return { loading: setLoading, images: setImages, assetGroupId: setAssetGroupId, assetIds: setAssetIds, error: setError, qa: setSheetQa };
        }

        // The sheet's bible, prompt, checklist, attempts and verdicts, without the large final image.
        function compactSheetQa(job) {
          const { image_data_url, ...result } = job.result || {};
          return {
            status: job.status, stage: job.stage, error: job.error || "", steps: job.steps || [],
            max_attempts: job.max_attempts, attempts: job.attempts || [], bible: job.bible, prompt: job.prompt,
            review_fixes: job.review_fixes || [], checklist: job.checklist, result: job.result ? result : null,
          };
        }

        // Polls a QA sheet job until it finishes; also resumes jobs found in a project after a reload.
        async function pollSheetJob(jobProjectId, jobId) {
          if (!jobId || sheetPollers.current[jobId]) return;
          sheetPollers.current[jobId] = true;
          const setters = sheetJobSetters();
          try {
            for (;;) {
              await new Promise((r) => setTimeout(r, 3000));
              const res = await fetch("/api/character-sheet/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_id: jobId }),
              });
              const job = await res.json();
              if (!res.ok) throw new Error(job.error || "Lost track of the sheet job");
              const qa = compactSheetQa(job);
              if (job.status === "running") {
                applyProjectJobUpdate(jobProjectId, "sheetsJob", { qa }, setters);
                continue;
              }
              if (job.status === "done") {
                applyProjectJobUpdate(jobProjectId, "sheetsJob", { qa, images: { instruction_1: job.result?.image_data_url || "" }, loading: false }, setters);
              } else {
                applyProjectJobUpdate(jobProjectId, "sheetsJob", { qa, error: job.error || "Character sheet generation failed", loading: false }, setters);
              }
              break;
            }
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "sheetsJob", { error: String(e?.message || e), loading: false }, setters);
          } finally {
            delete sheetPollers.current[jobId];
          }
        }

        function renderSheetQa(...args) {
          return renderSheetQaView({
            setModalImageUrl, setSheetQaView, sheetQa, sheetQaView, useSheetAttempt
          }, ...args);
        }

        // Switch the delivered sheet to another attempt (e.g. one you prefer visually).
        async function useSheetAttempt(attempt) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          try {
            const blob = await (await fetch(attempt.image)).blob();
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ""));
              reader.onerror = () => reject(new Error("Failed to read the attempt image"));
              reader.readAsDataURL(blob);
            });
            const qa = sheetQa ? { ...sheetQa, result: { ...(sheetQa.result || {}), attempt: attempt.number, passed: attempt.passed, image: attempt.image, criteria_total: attempt.criteria_total, criteria_passed: attempt.criteria_passed, chosenByUser: true } } : sheetQa;
            applyProjectJobUpdate(jobProjectId, "sheetsJob", { images: { instruction_1: dataUrl }, assetIds: { instruction_1: "" }, qa }, sheetJobSetters());
            setSheetQaView(attempt.number);
          } catch (e) {
            setError(String(e?.message || e));
          }
        }

        // Character Sheets (multi-character): adds the chosen sheets as references and opens that tool.
        async function useSheetsIn(target, items) {
          const refs = [];
          for (const it of items || []) {
            const blob = await (await fetch(it.url)).blob();
            const dataUrl = await readFileAsDataUrl(new File([blob], `${it.name}.png`, { type: blob.type || "image/png" }));
            refs.push({ key: `sheet:${it.url}`, name: `${it.name} sheet`, dataUrl, origin: "sheet" });
          }
          if (!refs.length) return;
          const merge = (prev, cap) => {
            const kept = (prev || []).filter((x) => !refs.some((r) => r.key === x.key));
            return [...refs, ...kept].slice(0, cap);
          };
          setError("");
          if (target === "video") {
            setVideoExtraRefImages((prev) => merge(prev, getVideoModelSpec(videoModel).refs.images));
            openToolByKey("video-generation");
          } else if (target === "long") {
            setLongLinkedSheetRefs((prev) => merge(prev, 9));
            openToolByKey("long-duration");
          } else if (target === "wb") {
            setWbRefImages((prev) => merge((prev || []).map((x) => x), 4));
            openToolByKey("storyboard");
          }
        }

        function linkSheetResultsToVideo(target) {
          const refs = [];
          if (images.instruction_1 && sheetSelections.instruction_1) refs.push({ key: "instruction_1", name: "Character sheet", dataUrl: images.instruction_1, origin: "sheet" });

          if (refs.length < 1) {
            setError("Generate at least one character sheet result first to link.");
            return;
          }

          setError("");
          setVideoError("");
          setLongCombineError("");
          setLongCombinedUrl("");
          setVideoRefUploadError("");
          if (target === "video") {
            setVideoExtraRefImages((prev) => {
              const uploads = (prev || []).filter((x) => x?.origin !== "sheet");
              const maxImages = getVideoModelSpec(videoModel).refs.images;
              const keptUploads = uploads.slice(0, Math.max(0, maxImages - refs.length));
              if (uploads.length > keptUploads.length) {
                setVideoRefUploadError(`Max ${Math.max(0, maxImages - refs.length)} additional reference images allowed when ${refs.length} sheet image${refs.length === 1 ? "" : "s"} are linked. Extra files were ignored.`);
              }
              return [...refs, ...keptUploads].slice(0, maxImages);
            });
          }
          if (target === "long") {
            setLongLinkedSheetRefs(refs);
          }
          if (target === "wb") {
            upsertWbLinkedRefs("wb-sheet", refs.map((x) => ({ name: x.name, dataUrl: x.dataUrl })));
          }

          if (target === "long") {
            setLongShots((prev) => prev.map((s) => ({ ...s, prompt: s.prompt || videoPrompt })));
          }
        }

        function upsertWbLinkedRefs(origin, refs) {
          setWbRefImages((prev) => {
            const kept = (prev || []).filter((x) => x?.origin !== origin);
            const next = [...kept, ...(refs || []).map((x) => ({ ...x, origin }))];
            return next.slice(0, 4);
          });
        }

        function removeWbLinkedRefs(origin) {
          setWbRefImages((prev) => (prev || []).filter((x) => x?.origin !== origin));
        }

        function upsertVideoLinkedRefs(origin, refs) {
          setVideoExtraRefImages((prev) => {
            const sheetRefs = (prev || []).filter((x) => x?.origin === "sheet");
            const nonSheetKept = (prev || []).filter((x) => x?.origin !== "sheet" && x?.origin !== origin);
            const incoming = (refs || []).map((x) => ({ ...x, origin }));
            const maxImages = getVideoModelSpec(videoModel).refs.images;
            const maxNonSheet = Math.max(0, maxImages - sheetRefs.length);
            return [...sheetRefs, ...[...nonSheetKept, ...incoming].slice(0, maxNonSheet)].slice(0, maxImages);
          });
        }

        function removeVideoLinkedRefs(origin) {
          setVideoExtraRefImages((prev) => (prev || []).filter((x) => x?.origin !== origin));
        }

        function upsertLongLinkedRefs(origin, refs) {
          setLongExtraRefImages((prev) => {
            const kept = (prev || []).filter((x) => x?.origin !== origin);
            return [...kept, ...(refs || []).map((x) => ({ ...x, origin }))].slice(0, 3);
          });
        }

        function removeLongLinkedRefs(origin) {
          setLongExtraRefImages((prev) => (prev || []).filter((x) => x?.origin !== origin));
        }

        function linkGeneratedCharacterToWorldBuilding(source) {
          if (source === "t2i") {
            if (!t2iImage) {
              setError("Generate a text-to-image character first to link it with Storyboard.");
              return;
            }
            upsertWbLinkedRefs("wb-t2i", [{ name: "Character generated (T2I)", dataUrl: t2iImage }]);
            return;
          }
          if (!i2iImage) {
            setError("Generate an image-to-image character first to link it with Storyboard.");
            return;
          }
          upsertWbLinkedRefs("wb-i2i", [{ name: "Character generated (I2I)", dataUrl: i2iImage }]);
        }

        function unlinkSheetResultsFromVideo() {
          setVideoRefUploadError("");
          setVideoExtraRefImages((prev) => (prev || []).filter((x) => x?.origin !== "sheet"));
        }

        function unlinkSheetResultsFromLong() {
          setLongLinkedSheetRefs([]);
        }

        function unlinkSheetResultsFromWb() {
          removeWbLinkedRefs("wb-sheet");
        }

        // Generic version of the same pattern for single-object jobs (T2I, I2I,
        // Character Sheets, Storyboard, Script-to-Prompt). jobKey names the field in
        // defaultProjectResults() that owns this job's persisted state; setters maps
        // patch field names to the matching global useState setter.
        function applyProjectJobUpdate(jobProjectId, jobKey, patch, setters) {
          if (jobProjectId) {
            setProjects((prev) => prev.map((p) => {
              if (p.id !== jobProjectId) return p;
              const prevResults = p.results || {};
              const prevJob = { ...defaultProjectResults()[jobKey], ...(prevResults[jobKey] || {}) };
              return { ...p, results: { ...defaultProjectResults(), ...prevResults, [jobKey]: { ...prevJob, ...patch } } };
            }));
          }
          if (jobProjectId && activeProjectIdRef.current !== jobProjectId) return;
          Object.keys(patch).forEach((key) => {
            const setter = setters[key];
            if (setter) setter(patch[key]);
          });
        }

        // Same pattern again, but for one shot inside a project's longShots array
        // (Long Duration) rather than a single job object. Falls back to updateLongShot
        // for the live global longShots array when this project is the active one.
        function applyLongShotUpdate(jobProjectId, index, shotLabel, patch) {
          if (jobProjectId) {
            setProjects((prev) => prev.map((p) => {
              if (p.id !== jobProjectId) return p;
              const prevResults = p.results || {};
              const defaultShotJob = defaultProjectResults().longShots[0];
              const prevShots = prevResults.longShots || [];
              const idx = prevShots.findIndex((s) => s.label === shotLabel);
              const prevShot = idx >= 0 ? { ...defaultShotJob, ...prevShots[idx] } : { ...defaultShotJob, label: shotLabel };
              const nextShot = { ...prevShot, ...patch };
              const nextShots = idx >= 0 ? prevShots.map((s, i) => (i === idx ? nextShot : s)) : [...prevShots, nextShot];
              return { ...p, results: { ...defaultProjectResults(), ...prevResults, longShots: nextShots } };
            }));
          }
          if (jobProjectId && activeProjectIdRef.current !== jobProjectId) return;
          updateLongShot(index, patch);
        }

        // Writer for one of the parallel takes inside a shot. The three polls
        // run concurrently, so each merges into the shot's variant list instead
        // of replacing it.
        function applyLongShotVariantUpdate(jobProjectId, index, shotLabel, variantIndex, patch) {
          const mergeVariants = (variants) => {
            const list = Array.isArray(variants) ? [...variants] : [];
            while (list.length <= variantIndex) list.push({ taskId: "", status: "", url: "", lastFrameUrl: "", error: "" });
            list[variantIndex] = { ...list[variantIndex], ...patch };
            return list;
          };
          if (jobProjectId) {
            setProjects((prev) => prev.map((p) => {
              if (p.id !== jobProjectId) return p;
              const prevResults = p.results || {};
              const defaultShotJob = defaultProjectResults().longShots[0];
              const prevShots = prevResults.longShots || [];
              const idx = prevShots.findIndex((shot) => shot.label === shotLabel);
              const prevShot = idx >= 0 ? { ...defaultShotJob, ...prevShots[idx] } : { ...defaultShotJob, label: shotLabel };
              const nextShot = { ...prevShot, variants: mergeVariants(prevShot.variants) };
              const nextShots = idx >= 0 ? prevShots.map((shot, i) => (i === idx ? nextShot : shot)) : [...prevShots, nextShot];
              return { ...p, results: { ...defaultProjectResults(), ...prevResults, longShots: nextShots } };
            }));
          }
          if (jobProjectId && activeProjectIdRef.current !== jobProjectId) return;
          setLongShots((prev) => prev.map((shot, i) => (i === index ? { ...shot, variants: mergeVariants(shot.variants) } : shot)));
        }

        // Picking a different take re-points the shot at that video: it is the
        // one that gets combined, and its last frame is what the next shot
        // starts from.
        function selectLongShotVariant(index, shotLabel, variantIndex) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const variant = ((longShots[index] || {}).variants || [])[variantIndex];
          if (!variant?.url) return;
          applyLongShotUpdate(jobProjectId, index, shotLabel, {
            selectedVariant: variantIndex,
            videoUrl: variant.url,
            lastFrameUrl: variant.lastFrameUrl || "",
            videoAssetId: "",
            videoAssetUrl: "",
          });
        }

        // Single writer for a Video Generation job's live state. When jobProjectId is
        // set, the patch always lands in that project's own results.videoJob first —
        // so a job survives the user switching to a different project mid-generation.
        // The shared display state (videoUrl/videoVariants/etc.) only gets the update
        // too if that project is still the one currently on screen; otherwise the
        // active project's own panel is left alone.
        function applyVideoJobUpdate(jobProjectId, patch) {
          if (jobProjectId) {
            setProjects((prev) => prev.map((p) => {
              if (p.id !== jobProjectId) return p;
              const prevResults = p.results || {};
              const prevJob = { ...defaultProjectResults().videoJob, ...(prevResults.videoJob || {}) };
              return { ...p, results: { ...defaultProjectResults(), ...prevResults, videoJob: { ...prevJob, ...patch } } };
            }));
          }
          if (jobProjectId && activeProjectIdRef.current !== jobProjectId) return;
          if (Object.prototype.hasOwnProperty.call(patch, "url")) setVideoUrl(patch.url);
          if (Object.prototype.hasOwnProperty.call(patch, "variants")) setVideoVariants(patch.variants);
          if (Object.prototype.hasOwnProperty.call(patch, "selectedVariant")) setVideoSelectedVariant(patch.selectedVariant);
          if (Object.prototype.hasOwnProperty.call(patch, "loading")) setVideoLoading(patch.loading);
          if (Object.prototype.hasOwnProperty.call(patch, "error")) setVideoError(patch.error);
          if (Object.prototype.hasOwnProperty.call(patch, "generatedPrompt")) setVideoGeneratedPrompt(patch.generatedPrompt);
          if (Object.prototype.hasOwnProperty.call(patch, "textOverlay")) setVideoTextOverlay(patch.textOverlay);
        }

        // Same contract as applyVideoJobUpdate, for a duplicated Video
        // Generation panel: the patch lands in that project's own saved clone
        // first, so a clone's job survives switching projects mid-generation,
        // and only reaches the on-screen clone if that project is still open.
        function applyVideoCloneUpdate(jobProjectId, cloneId, patch) {
          if (jobProjectId) {
            setProjects((prev) => prev.map((project) => {
              if (project.id !== jobProjectId) return project;
              const drafts = { ...defaultProjectDrafts(), ...(project.drafts || {}) };
              return {
                ...project,
                drafts: {
                  ...drafts,
                  videoClones: (drafts.videoClones || []).map((clone) => (clone.id === cloneId ? { ...clone, ...patch } : clone)),
                },
              };
            }));
          }
          if (jobProjectId && activeProjectIdRef.current !== jobProjectId) return;
          setVideoClones((prev) => prev.map((clone) => (clone.id === cloneId ? { ...clone, ...patch } : clone)));
        }

        // Writer for one of the parallel videos inside a panel. The three polls
        // run concurrently, so each one merges into the variant list rather
        // than replacing it, and — like the panel-level writers — lands in the
        // owning project first so a run survives a project switch.
        function applyVideoVariantUpdate(jobProjectId, panelId, index, patch) {
          const mergeVariants = (variants) => {
            const list = Array.isArray(variants) ? [...variants] : [];
            while (list.length <= index) list.push({ taskId: "", status: "", url: "", error: "" });
            list[index] = { ...list[index], ...patch };
            return list;
          };
          if (jobProjectId) {
            setProjects((prev) => prev.map((project) => {
              if (project.id !== jobProjectId) return project;
              if (panelId === "main") {
                const prevResults = { ...defaultProjectResults(), ...(project.results || {}) };
                const prevJob = { ...defaultProjectResults().videoJob, ...(prevResults.videoJob || {}) };
                return { ...project, results: { ...prevResults, videoJob: { ...prevJob, variants: mergeVariants(prevJob.variants) } } };
              }
              const drafts = { ...defaultProjectDrafts(), ...(project.drafts || {}) };
              return {
                ...project,
                drafts: {
                  ...drafts,
                  videoClones: (drafts.videoClones || []).map((clone) => (
                    clone.id === panelId ? { ...clone, variants: mergeVariants(clone.variants) } : clone
                  )),
                },
              };
            }));
          }
          if (jobProjectId && activeProjectIdRef.current !== jobProjectId) return;
          if (panelId === "main") {
            setVideoVariants((prev) => mergeVariants(prev));
          } else {
            setVideoClones((prev) => prev.map((clone) => (
              clone.id === panelId ? { ...clone, variants: mergeVariants(clone.variants) } : clone
            )));
          }
        }

        async function pollVideoStatus(taskId, applyUpdate) {
          while (true) {
            const res = await fetch("/api/video/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ task_id: taskId }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to fetch video status");
            }
            const task = data.task || {};
            const status = task.status || "";
            applyUpdate({ status: status || "queued" });
            if (status === "succeeded") {
              const url = task.video_url || task.file_url || "";
              applyUpdate({ url, movUrl: task.mov_url || "", genSeconds: taskGenSeconds(task), finishedAt: Date.now() });
              if (!url) {
                throw new Error("Video task succeeded but no video URL was returned.");
              }
              return task;
            }
            if (status === "failed" || status === "cancelled") {
              const msg = task.error?.message || "Video generation failed.";
              throw new Error(msg);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        // ---- Text Overlay projects ------------------------------------------
        // Seedance misspells on-screen text, so in "text-overlay" projects every
        // readable text is rendered as an image first (/api/text-overlay/generate)
        // and passed to /api/video/start as text_overlays. The tool's own
        // reference images (brand logo, product, UI) go to the planner and to
        // Seedream too: a moment a reference already shows is marked
        // covered_by_reference and never regenerated, and a moment that needs
        // the logo plus extra text is rendered from it. Other project types
        // never reach any of this.
        function isTextOverlayProjectId(projectId) {
          return !!projectId && (projects.find((p) => p.id === projectId) || {}).type === "text-overlay";
        }

        // Seedance accepts 9 reference images; overlays get what the tool's own
        // references leave over, at most 8.
        const MAX_VIDEO_REFERENCE_IMAGES = 9;

        async function requestTextOverlays(target, body) {
          const res = await fetch("/api/text-overlay/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ratio: target.ratio,
              references: target.references,
              max_overlays: target.maxOverlays,
              ...body,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to render text overlays");
          return data;
        }

        // Only inline and http(s) images can be read by the planner and Seedream.
        function textOverlayReferences(items) {
          return (items || [])
            .map((item, i) => ({ image: getVideoPromptImageValue(item), name: String(item?.name || `reference ${i + 1}`) }))
            .filter((ref) => ref.image.startsWith("data:") || ref.image.startsWith("http"));
        }

        // Overlays planned against one set of references are stale once that set
        // changes, because covered/used reference numbers point into it.
        function textOverlayReferenceSignature(references) {
          return (references || []).map((ref) => `${ref.name}:${ref.image.length}`).join("|");
        }

        function textOverlayStateFromResponse(data, target) {
          return {
            ...defaultTextOverlayState(),
            styleGuide: data.style_guide || "",
            screenStyleGuide: data.screen_style_guide || "",
            backdrop: data.backdrop || "",
            overlays: data.overlays || [],
            forPrompt: (target.prompt || "").trim(),
            forRefs: textOverlayReferenceSignature(target.references),
          };
        }

        function isCoveredTextOverlay(o) {
          return !!o?.covered_by_reference && !o?.image;
        }

        function textOverlayHasContent(o) {
          return !!((o?.text || "").trim() || o?.covered_by_reference || (o?.use_references || []).length);
        }

        // The first usable image of each kind is the style every other overlay
        // of that kind is rendered to match — preferring one without a brand
        // reference, so the logo is not carried into plain text overlays.
        function textOverlayAnchors(overlays, skipIndexes = []) {
          const anchors = {};
          [false, true].forEach((allowReferences) => {
            (overlays || []).forEach((o, i) => {
              if (skipIndexes.includes(i) || !o?.image || o.stale || anchors[o.kind]) return;
              if (!allowReferences && (o.use_references || []).length) return;
              anchors[o.kind] = o.image;
            });
          });
          return anchors;
        }

        function toTextOverlayPayload(overlays) {
          return (overlays || [])
            .filter((o) => o.image || isCoveredTextOverlay(o))
            .map((o) => ({
              image: o.image || "",
              text: o.text,
              kind: o.kind,
              shot: o.shot || "",
              placement: o.placement || "",
              device: o.device || "",
              covered_by_reference: o.image ? 0 : (o.covered_by_reference || 0),
            }));
        }

        // A target is one prompt's overlay state plus its project-safe writer:
        // { prompt, ratio, references, maxOverlays, current, apply(textOverlay), extraAnchors }.
        function videoPanelTextOverlayTarget(inst) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const references = textOverlayReferences(inst.extraRefImages);
          const usesCharacterImage = inst.isMain && ((useI2IForVideoAll && i2iImage) || (useT2IForVideoAll && t2iImage));
          const usedSlots = (inst.extraRefImages || []).length + (usesCharacterImage ? 1 : 0);
          return {
            prompt: inst.prompt || "",
            ratio: inst.ratio,
            references,
            maxOverlays: Math.min(8, MAX_VIDEO_REFERENCE_IMAGES - usedSlots),
            current: inst.textOverlay,
            apply: (textOverlay) => (inst.isMain
              ? applyVideoJobUpdate(jobProjectId, { textOverlay })
              : applyVideoCloneUpdate(jobProjectId, inst.id, { textOverlay })),
            extraAnchors: {},
          };
        }

        // Long Duration shots also match the overlays of earlier shots, so the
        // text style holds across the whole sequence.
        function longShotTextOverlayTarget(index) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const shot = longShots[index] || {};
          const earlier = longShots.slice(0, index).flatMap((s) => (s.textOverlay || {}).overlays || []);
          const pool = (longExtraRefImages.length ? longExtraRefImages : videoExtraRefImages).slice(0, 3);
          const referenceItems = [...(shot.refImages || []), ...pool];
          const startFrameSlot = index > 0 || shotASeedVideoDataUrl || shotASeedVideoAssetUrl || shotASeedSourceUrl ? 1 : 0;
          return {
            prompt: (shot.prompt || "").trim() || videoPrompt.trim(),
            ratio: longRatio,
            references: textOverlayReferences(referenceItems),
            maxOverlays: Math.min(8, MAX_VIDEO_REFERENCE_IMAGES - referenceItems.length - startFrameSlot),
            current: shot.textOverlay,
            apply: (textOverlay) => applyLongShotUpdate(jobProjectId, index, shot.label, { textOverlay }),
            extraAnchors: textOverlayAnchors(earlier),
          };
        }

        async function onBuildTextOverlays(target) {
          const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
          const prompt = (target.prompt || "").trim();
          if (!prompt) return;
          target.apply({ ...state, loading: true, error: "" });
          try {
            const data = await requestTextOverlays(target, { prompt, anchors: target.extraAnchors });
            target.apply(textOverlayStateFromResponse(data, target));
          } catch (e) {
            target.apply({ ...state, loading: false, error: String(e?.message || e) });
          }
        }

        // `override` replaces the overlay before rendering — used to turn a
        // reference-covered moment into a rendered one.
        async function onRegenerateTextOverlay(target, index, override) {
          const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
          const overlay = override || state.overlays[index];
          if (!overlay || !textOverlayHasContent(overlay)) return;
          target.apply({ ...state, loading: true, error: "" });
          try {
            const data = await requestTextOverlays(target, {
              overlays: [{ ...overlay, image: "" }],
              style_guide: state.styleGuide,
              screen_style_guide: state.screenStyleGuide,
              backdrop: state.backdrop,
              anchors: { ...target.extraAnchors, ...textOverlayAnchors(state.overlays, [index]) },
            });
            const rendered = (data.overlays || [])[0];
            if (!rendered) throw new Error("No overlay image returned.");
            target.apply({ ...state, loading: false, overlays: state.overlays.map((o, i) => (i === index ? { ...rendered, stale: false } : o)) });
          } catch (e) {
            target.apply({ ...state, loading: false, error: String(e?.message || e) });
          }
        }

        function onRenderCoveredTextOverlay(target, index) {
          const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
          const overlay = state.overlays[index];
          if (!overlay?.covered_by_reference) return;
          const n = overlay.covered_by_reference;
          onRegenerateTextOverlay(target, index, {
            ...overlay,
            covered_by_reference: 0,
            use_references: [n],
            reference_usage: `Recreate reference image ${n} exactly — same logo, text, colours and layout.`,
          });
        }

        function onEditTextOverlay(target, index, text) {
          const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
          target.apply({ ...state, overlays: state.overlays.map((o, i) => (i === index ? { ...o, text, stale: true } : o)) });
        }

        function onRemoveTextOverlay(target, index) {
          const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
          target.apply({ ...state, overlays: state.overlays.filter((_, i) => i !== index) });
        }

        // Called right before a video starts. Reuses overlays already built for
        // this prompt and these references, rebuilds them when either changed
        // (auto on), and re-renders any whose text was edited. Throws when an
        // overlay has no image, so a video is never generated with the text
        // left to Seedance.
        async function prepareTextOverlays(target, auto) {
          const state = { ...defaultTextOverlayState(), ...(target.current || {}) };
          const prompt = (target.prompt || "").trim();
          const upToDate = state.forPrompt === prompt && (state.forRefs || "") === textOverlayReferenceSignature(target.references);
          const reusable = !!state.forPrompt && (!auto || upToDate);
          if (!reusable && !auto) return [];
          target.apply({ ...state, loading: true, error: "" });
          let next = state;
          try {
            if (!reusable) {
              const data = await requestTextOverlays(target, { prompt, anchors: target.extraAnchors });
              next = textOverlayStateFromResponse(data, target);
            } else {
              const overlays = state.overlays.filter(textOverlayHasContent);
              const redo = overlays.map((o, i) => (o.stale || (!o.image && !isCoveredTextOverlay(o)) ? i : -1)).filter((i) => i >= 0);
              if (redo.length) {
                const data = await requestTextOverlays(target, {
                  overlays: redo.map((i) => ({ ...overlays[i], image: "" })),
                  style_guide: state.styleGuide,
                  screen_style_guide: state.screenStyleGuide,
                  backdrop: state.backdrop,
                  anchors: { ...target.extraAnchors, ...textOverlayAnchors(overlays, redo) },
                });
                const rendered = data.overlays || [];
                next = { ...state, overlays: overlays.map((o, i) => (redo.includes(i) ? { ...(rendered[redo.indexOf(i)] || o), stale: false } : o)) };
              } else {
                next = { ...state, overlays };
              }
            }
          } catch (e) {
            target.apply({ ...state, loading: false });
            throw e;
          }
          target.apply({ ...next, loading: false, error: "" });
          const failed = next.overlays.filter((o) => !isCoveredTextOverlay(o) && (!o.image || o.error));
          if (failed.length) {
            throw new Error(`${failed.length} text overlay image${failed.length === 1 ? "" : "s"} could not be rendered — re-render ${failed.length === 1 ? "it" : "them"} or remove ${failed.length === 1 ? "it" : "them"} before generating.`);
          }
          const renderedCount = next.overlays.filter((o) => o.image).length;
          if (renderedCount > target.maxOverlays) {
            throw new Error(`${renderedCount} overlay images plus the tool's reference images exceed Seedance's limit of ${MAX_VIDEO_REFERENCE_IMAGES} — remove ${renderedCount - Math.max(0, target.maxOverlays)} overlay${renderedCount - target.maxOverlays === 1 ? "" : "s"} or a reference image.`);
          }
          return next.overlays;
        }

        async function onGenerateVideoFor(inst) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const applyUpdate = inst.isMain
            ? (patch) => applyVideoJobUpdate(jobProjectId, patch)
            : (patch) => applyVideoCloneUpdate(jobProjectId, inst.id, patch);
          // Only the original panel is wired to the Character Generation
          // results; a duplicate generates from its own references alone.
          const allowCharacterLinks = inst.isMain;
          const modelSpec = getVideoModelSpec(inst.model);
          const refLimitError = referenceLimitError(modelSpec, (inst.extraRefImages || []).length, await withVideoDurations(inst.refVideos || []), inst.audioRefs || []);
          if (refLimitError) {
            applyUpdate({ error: `${refLimitError} Remove some references or switch to Seedance 2.5.` });
            return;
          }

          applyUpdate({ error: "", url: "", generatedPrompt: "", variants: [], selectedVariant: 0 });
          const hasT2I = !!t2iImage;
          const hasI2I = !!i2iImage;
          const sheetRefs = (inst.extraRefImages || []).filter((x) => x?.origin === "sheet");
          const uploadRefs = (inst.extraRefImages || []).filter((x) => x?.origin !== "sheet");
          const hasSheetsLinked = sheetRefs.length > 0;
          const hasUploadedRefs = uploadRefs.length > 0;
          const useI2I = allowCharacterLinks && useI2IForVideoAll;
          const useT2I = allowCharacterLinks && useT2IForVideoAll;

          if (useI2I) {
            if (!hasI2I) {
              applyUpdate({ error: "Generate an image-to-image character first to use it directly for video." });
              return;
            }
          } else if (useT2I) {
            if (!hasT2I) {
              applyUpdate({ error: "Generate a text-to-image character first to use it directly for video." });
              return;
            }
          }
          if (!(inst.prompt || "").trim()) {
            applyUpdate({ error: "Enter a video prompt." });
            return;
          }

          let textOverlaysForVideo = [];
          if (isTextOverlayProjectId(jobProjectId)) {
            applyUpdate({ loading: true });
            try {
              textOverlaysForVideo = await prepareTextOverlays(videoPanelTextOverlayTarget(inst), inst.autoTextOverlays !== false);
            } catch (e) {
              applyUpdate({ loading: false, error: `Text overlays: ${String(e?.message || e)}` });
              return;
            }
          }

          // Show the three result slots as soon as the run starts, so the row
          // fills in rather than appearing all at once at the end.
          applyUpdate({ loading: true, variants: emptyVideoVariants() });

          try {
            // Reference images go to Seedance directly: the image itself (data URL, /files/ or http link)
            // wins over an asset-library id, which is used only when there is no other copy.
            const directRef = (item) => [item?.dataUrl, item?.assetUrl].find((v) => typeof v === "string" && /^(data:|https?:|\/files\/)/.test(v)) || "";
            const getReferenceValue = (item) => directRef(item) || item?.assetId || "";
            const assetOnly = (x) => !directRef(x) && !!x?.assetId;
            const durationValue = inst.smartLength ? null : Number(inst.duration);
            if (!inst.smartLength) {
              if (!Number.isFinite(durationValue) || durationValue < MIN_VIDEO_DURATION || durationValue > modelSpec.maxDuration) {
                throw new Error(`Duration must be between ${MIN_VIDEO_DURATION} and ${modelSpec.maxDuration} seconds for ${modelSpec.label}, or enable Smart length.`);
              }
            }
            if (inst.resolution && !modelSpec.resolutions.includes(inst.resolution)) {
              throw new Error(`${modelSpec.label} supports only ${modelSpec.resolutions.join(", ")}.`);
            }

            let effectiveRefs = [];
            let effectiveAssets = [];
            let referenceImageRoles = [];
            let extraReferenceImages = [];
            let promptReferenceImages = [];

            if (hasSheetsLinked) {
              const main = sheetRefs.slice(0, 3);
              promptReferenceImages = main.map(getVideoPromptImageValue).filter(Boolean);
              effectiveAssets = main.filter(assetOnly).map((x) => x.assetId);
              effectiveRefs = main.filter((x) => !assetOnly(x)).map(getReferenceValue).filter(Boolean);
              referenceImageRoles = main.map((x, idx) => {
                const n = String(x?.name || "").toLowerCase();
                if (n.includes("face")) return "face/identity reference";
                if (n.includes("full body") || n.includes("fullbody") || n.includes("body")) return "full-body reference (outfit/physique)";
                if (n.includes("pose")) return "pose/motion reference";
                if (n.includes("expression")) return "facial expression reference";
                return `reference image ${idx + 1}`;
              });
              extraReferenceImages = [...sheetRefs.slice(3), ...uploadRefs]
                .filter((x) => !assetOnly(x))
                .map(getReferenceValue)
                .filter(Boolean);
              effectiveAssets = [
                ...effectiveAssets,
                ...[...sheetRefs.slice(3), ...uploadRefs].filter(assetOnly).map((x) => x.assetId),
              ];
            } else if (useI2I && i2iImage) {
              effectiveRefs = [i2iImage];
              effectiveAssets = [];
              promptReferenceImages = [i2iImage];
              referenceImageRoles = ["character generated reference"];
              extraReferenceImages = uploadRefs.map(getReferenceValue).filter(Boolean);
            } else if (useT2I && t2iImage) {
              effectiveRefs = [t2iImage];
              effectiveAssets = [];
              promptReferenceImages = [t2iImage];
              referenceImageRoles = ["character generated reference"];
              extraReferenceImages = uploadRefs.map(getReferenceValue).filter(Boolean);
            } else if (hasUploadedRefs) {
              const main = uploadRefs.slice(0, 3);
              promptReferenceImages = main.map(getVideoPromptImageValue).filter(Boolean);
              effectiveAssets = main.filter(assetOnly).map((x) => x.assetId);
              effectiveRefs = main.filter((x) => !assetOnly(x)).map(getReferenceValue).filter(Boolean);
              referenceImageRoles = main.map((x, idx) => {
                const n = String(x?.name || "").toLowerCase();
                if (n.includes("face")) return "face/identity reference";
                if (n.includes("full body") || n.includes("fullbody") || n.includes("body")) return "full-body reference (outfit/physique)";
                if (n.includes("pose")) return "pose/motion reference";
                if (n.includes("expression")) return "facial expression reference";
                return `reference image ${idx + 1}`;
              });
              extraReferenceImages = uploadRefs.slice(3).filter((x) => !assetOnly(x)).map(getReferenceValue).filter(Boolean);
              effectiveAssets = [...effectiveAssets, ...uploadRefs.slice(3).filter(assetOnly).map((x) => x.assetId)];
            }

            const res = await fetch("/api/video/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: (inst.prompt || "").trim(),
                model: modelSpec.id,
                skills: projectSkillIdsForGeneration(),
                reference_images: effectiveRefs,
                prompt_reference_images: promptReferenceImages,
                reference_image_roles: referenceImageRoles,
                reference_assets: effectiveAssets,
                draft: !!(inst.draftMode && modelSpec.draft),
                extra_reference_images: extraReferenceImages,
                audios: (inst.audioRefs || []).map((x) => x.dataUrl),
                videos: (inst.refVideos || []).map(getReferenceValue).filter(Boolean),
                text_overlays: toTextOverlayPayload(textOverlaysForVideo),
                variants: VIDEO_VARIANT_COUNT,
                config: {
                  resolution: inst.draftMode && modelSpec.draft ? "480p" : inst.resolution,
                  ratio: inst.ratio,
                  frames_per_second: Number(inst.fps),
                  duration: durationValue,
                  output_format: modelSpec.mov && !(inst.draftMode && modelSpec.draft) && inst.outputFormat === "mov" ? "mov" : "mp4",
                },
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to start video generation");
            }
            const isDraftRun = !!(inst.draftMode && modelSpec.draft);
            const taskIds = (Array.isArray(data.task_ids) && data.task_ids.length ? data.task_ids : [data.task_id])
              .map((x) => String(x || "").trim())
              .filter(Boolean);
            const generatedPrompt = data.generated_prompt || "";
            applyUpdate({ generatedPrompt });
            if (!taskIds.length) {
              throw new Error("No video task id returned.");
            }
            const startedAt = Date.now();
            applyUpdate({ variants: taskIds.map((taskId) => ({ taskId, status: "queued", url: "", error: "", startedAt, draft: isDraftRun, model: modelSpec.id, draftCreatedAt: isDraftRun ? startedAt : 0 })) });

            // The panel's canonical url is the earliest variation in the row
            // that succeeds, so it does not jump around as the others land.
            let bestIndex = Infinity;
            const results = await Promise.allSettled(taskIds.map((taskId, index) => {
              const applyVariant = (patch) => applyVideoVariantUpdate(jobProjectId, inst.id, index, patch);
              return pollVideoStatus(taskId, applyVariant).then((task) => {
                const url = task?.video_url || task?.file_url || "";
                if (url && index < bestIndex) {
                  bestIndex = index;
                  applyUpdate({ url, selectedVariant: index });
                }
              }).catch((err) => {
                applyVariant({ error: String(err?.message || err), status: "" });
                throw err;
              });
            }));
            // A variation that fails reports it in its own cell, so nothing is
            // re-thrown here — the panel-level error stays reserved for
            // failures that stopped the whole run from starting.
            void results;
          } catch (e) {
            applyUpdate({ error: String(e?.message || e) });
          } finally {
            applyUpdate({ loading: false });
          }
        }

        // Draft mode step 2: turns a draft variation into the final 1080p or 4K video. The final
        // task reuses the draft's prompt, references, duration, ratio and seed by itself.
        async function finalizeDraftVariant(inst, idx, variant, resolution = "1080p") {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const applyVariant = (patch) => applyVideoVariantUpdate(jobProjectId, inst.id, idx, patch);
          applyVariant({ finalizing: true, finalStatus: "starting", finalError: "", finalResolution: resolution });
          try {
            const res = await fetch("/api/video/finalize-draft", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ draft_task_id: variant.taskId, model: variant.model || inst.model, resolution }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not start the final video.");
            const finalTaskId = data.task_id;
            applyVariant({ finalTaskId, finalStatus: "queued" });
            const task = await pollVideoStatus(finalTaskId, (p) => applyVariant(p.status ? { finalStatus: p.status } : {}));
            const url = task?.video_url || task?.file_url || "";
            applyVariant({ finalizing: false, draft: false, final: true, draftUrl: variant.url, draftTaskId: variant.taskId, url, taskId: finalTaskId, status: "succeeded", genSeconds: taskGenSeconds(task), draftGenSeconds: variantGenSeconds(variant) });
            if (idx === (Number(inst.selectedVariant) || 0)) {
              if (inst.isMain) applyVideoJobUpdate(jobProjectId, { url });
              else applyVideoCloneUpdate(jobProjectId, inst.id, { url });
            }
          } catch (e) {
            applyVariant({ finalizing: false, finalError: String(e?.message || e) });
          }
        }

        function updateLongShot(index, patch) {
          setLongShots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
        }

        async function pollLongShot(taskId, applyUpdate) {
          while (true) {
            const res = await fetch("/api/video/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ task_id: taskId }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to fetch video status");
            }
            const task = data.task || {};
            const status = task.status || "";
            applyUpdate({ status: status || "queued" });
            if (status === "succeeded") {
              const url = task.video_url || task.file_url || "";
              const lastFrameUrl = task.last_frame_url || "";
              if (!url) {
                throw new Error("Video task succeeded but no video URL was returned.");
              }
              applyUpdate({ url, lastFrameUrl, movUrl: task.mov_url || "" });
              return task;
            }
            if (status === "failed" || status === "cancelled") {
              const msg = task.error?.message || "Video generation failed.";
              throw new Error(msg);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        // Long Duration's shared references (sheets linked from Character Sheets, then uploads).
        // Each shot picks which of them it uses, so a shot with two characters is not sent a third.
        const longSharedPool = [...(longLinkedSheetRefs || []), ...(longExtraRefImages || [])]
          .map((it, i) => ({ ...it, poolKey: it.key || `${it.name || "ref"}-${i}` }));
        function longShotPool(shot, pool = longSharedPool) {
          if (!Array.isArray(shot.poolKeys)) return pool;
          return pool.filter((it) => shot.poolKeys.includes(it.poolKey));
        }
        // Image numbers as the video model sees them: the start frame first (every shot after
        // the first, or Shot A with a seed video), then the shot's shared references, then its uploads.
        function longShotImageNumbers(index, shot, fullPool = longSharedPool) {
          const hasStart = index > 0 || !!(shotASeedVideoDataUrl || shotASeedVideoAssetUrl || shotASeedSourceUrl);
          const offset = hasStart ? 1 : 0;
          const pool = longShotPool(shot, fullPool);
          return {
            hasStart,
            pool: pool.map((it, i) => ({ n: offset + i + 1, name: (it.name || "reference").replace(/ sheet$/i, ""), role: it.role || "" })),
            uploads: (shot.refImages || []).map((it, i) => ({ n: offset + pool.length + i + 1, name: (it.name || "image").replace(/\.[a-z0-9]+$/i, "") })),
          };
        }
        function suggestLongShotRoles(index, shot, fullPool = longSharedPool) {
          const nums = longShotImageNumbers(index, shot, fullPool);
          const lines = [];
          if (nums.hasStart) lines.push("@Image1 is the start frame of this shot.");
          nums.pool.forEach((r) => lines.push(r.role === "character" ? `@Image${r.n} is the character ${r.name} (character sheet).`
            : r.role === "location" ? `@Image${r.n} is the location ${r.name}.` : `@Image${r.n} is ${r.name}.`));
          nums.uploads.forEach((r) => lines.push(`@Image${r.n} is ${r.name}.`));
          return lines.join("\n");
        }

        // Script to Prompt → Character Sheets / Location Variations → Long Duration, automatically.
        // Each sheet or location plate that finishes joins Long Duration's shared references
        // (role "character" / "location"); every shot whose "IN THIS SHOT:" line names it
        // picks it, and its reference-role lines ("@Image2 is the character Maya …") are
        // rewritten unless you have edited them by hand.
        function shotNamesOnScreen(prompt) {
          const line = (String(prompt || "").match(/IN THIS SHOT:\s*(.+)/i) || [])[1] || "";
          return line.split(/[,·;|]/).map((x) => x.replace(/\(.*?\)/g, "").trim().toLowerCase()).filter((x) => x.length > 1);
        }
        function autoMapLongShots(shots, fullPool) {
          const norm = (x) => String(x || "").toLowerCase().replace(/ sheet$/, "").trim();
          const autoItems = fullPool.filter((it) => it.role === "character" || it.role === "location");
          return shots.map((shot, index) => {
            const names = shotNamesOnScreen(shot.prompt);
            let next = shot;
            if (names.length && autoItems.length) {
              // Whole-word match either way: "INT. ROADSIDE DINER - NIGHT" names "Roadside Diner", but "Leo" is not "leopard".
              const words = (x) => ` ${String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
              const matched = autoItems.filter((it) => {
                const nm = words(norm(it.name));
                return nm.trim() && names.some((n) => words(n).includes(nm) || (n.length > 2 && nm.includes(words(n))));
              });
              const autoKeys = new Set(autoItems.map((it) => it.poolKey));
              const manual = (Array.isArray(shot.poolKeys) ? shot.poolKeys : fullPool.map((it) => it.poolKey)).filter((k) => !autoKeys.has(k));
              // Characters first, then the location, in the order of the shared pool.
              const ordered = [...matched.filter((it) => it.role === "character"), ...matched.filter((it) => it.role === "location")].map((it) => it.poolKey);
              next = { ...shot, poolKeys: [...ordered, ...manual.filter((k) => fullPool.some((it) => it.poolKey === k))] };
            }
            const handEdited = (next.refRoles || "").trim() && next.refRoles !== next.refRolesAuto;
            if (!handEdited && (next.prompt || "").trim() && longShotPool(next, fullPool).length) {
              const roles = suggestLongShotRoles(index, next, fullPool);
              next = { ...next, refRoles: roles, refRolesAuto: roles };
            }
            return next;
          });
        }
        function toLongPool(linked, extra) {
          return [...(linked || []), ...(extra || [])].map((it, i) => ({ ...it, poolKey: it.key || `${it.name || "ref"}-${i}` }));
        }
        const longAutoRef = useRef({ linked: [], extra: [] });
        longAutoRef.current = { linked: longLinkedSheetRefs || [], extra: longExtraRefImages || [] };
        const onReferenceReadyRef = useRef(null);
        onReferenceReadyRef.current = (detail) => {
          const { kind, name, url } = detail || {};
          if (!url || !name || !["character", "location"].includes(kind)) return;
          const key = `auto:${kind}:${String(name).trim().toLowerCase()}`;
          const item = { key, name: String(name).trim(), dataUrl: url, origin: "sheet", role: kind };
          const linked = [...longAutoRef.current.linked.filter((x) => x.key !== key), item];
          longAutoRef.current = { ...longAutoRef.current, linked };
          setLongLinkedSheetRefs(linked);
          const pool = toLongPool(linked, longAutoRef.current.extra);
          setLongShots((prev) => autoMapLongShots(prev, pool));
        };
        useEffect(() => {
          const on = (e) => onReferenceReadyRef.current && onReferenceReadyRef.current(e.detail);
          window.addEventListener("cc-reference-ready", on);
          return () => window.removeEventListener("cc-reference-ready", on);
        }, []);

        // A shot's duration: set on the shot, else the runtime its prompt states, else the default.
        function longShotDuration(shot) {
          const spec = getVideoModelSpec(longModel);
          const clamp = (n) => Math.min(spec.maxDuration, Math.max(MIN_LONG_DURATION, Math.round(n)));
          if (Number(shot.duration) > 0) return { value: clamp(Number(shot.duration)), source: "set" };
          const fromPrompt = runtimeFromPrompt(shot.prompt || "");
          if (fromPrompt) return { value: clamp(fromPrompt), source: "prompt", stated: fromPrompt };
          return { value: clamp(Number(longDuration) || MIN_LONG_DURATION), source: "default" };
        }

        async function onGenerateLongShot(index) {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const shotLabel = (longShots[index] || {}).label;
          applyProjectJobUpdate(jobProjectId, "longCombineJob", { error: "", url: "" }, { error: setLongCombineError, url: setLongCombinedUrl });
          applyLongShotUpdate(jobProjectId, index, shotLabel, { error: "", videoUrl: "", videoAssetId: "", videoAssetUrl: "", lastFrameUrl: "", variants: [], selectedVariant: 0, generatedPrompt: "" });

          const shot = longShots[index] || {};
          const prompt = (shot.prompt || "").trim() || videoPrompt.trim();
          if (!prompt) {
            applyLongShotUpdate(jobProjectId, index, shotLabel, { error: "Enter a prompt for this shot (or fill the main video prompt)." });
            return;
          }
          if (index > 0 && !longShots[index - 1]?.videoUrl) {
            applyLongShotUpdate(jobProjectId, index, shotLabel, { error: "Generate the previous shot first (needs previous video)." });
            return;
          }

          const hasSheets = !!images.instruction_1;
          const hasT2I = !!t2iImage;
          const hasI2I = !!i2iImage;
          const longReferencePool = longSharedPool.length ? longShotPool(shot) : videoExtraRefImages;
          const hasUploadedRefs = longReferencePool.length > 0;

          if (useI2IForVideoAll) {
            if (!hasI2I) {
              applyLongShotUpdate(jobProjectId, index, shotLabel, { error: "Generate an image-to-image character first to use it directly for video." });
              return;
            }
          } else if (useT2IForVideoAll) {
            if (!hasT2I) {
              applyLongShotUpdate(jobProjectId, index, shotLabel, { error: "Generate a text-to-image character first to use it directly for video." });
              return;
            }
          }

          let effectiveRefs = [];
          let effectivePromptRefs = null;
          let effectiveAssets = [];

          if (useI2IForVideoAll && i2iImage) {
            effectiveRefs = [i2iImage, i2iImage, i2iImage];
            effectiveAssets = [];
          } else if (useT2IForVideoAll && t2iImage) {
            effectiveRefs = [t2iImage, t2iImage, t2iImage];
            effectiveAssets = [];
          } else if (hasUploadedRefs) {
            const poolItems = longReferencePool.filter((x) => x?.dataUrl);
            effectiveRefs = poolItems.map((x) => x.dataUrl);
            // Asset-group images go to Seedance as asset:// but the prompt LLM needs their http link.
            effectivePromptRefs = poolItems.map((x) => getVideoPromptImageValue(x) || x.dataUrl);
            effectiveAssets = [];
          } else if (hasSheets && !longSharedPool.length) {
            effectiveRefs = [images.instruction_1];
            effectiveAssets = [];
          }

          const shotModelSpec = getVideoModelSpec(longModel);
          const durationValue = longShotDuration(shot).value;

          const shotRefImages = (shot.refImages || []).map((x) => x?.dataUrl).filter(Boolean);
          const shotRefAudios = (shot.refAudios || []).map((x) => x?.dataUrl).filter(Boolean);
          const shotRefAudioTotal = (shot.refAudios || []).reduce((acc, x) => acc + Number(x?.duration || 0), 0);
          const shotRefLimitError = referenceLimitError(shotModelSpec, 0, index > 0 ? await withVideoDurations(shot.refVideos || []) : [], shot.refAudios || []);
          if (shotRefLimitError) {
            applyLongShotUpdate(jobProjectId, index, shotLabel, { error: shotRefLimitError });
            return;
          }

          let textOverlaysForShot = [];
          if (isTextOverlayProjectId(jobProjectId)) {
            applyLongShotUpdate(jobProjectId, index, shotLabel, { loading: true });
            try {
              textOverlaysForShot = await prepareTextOverlays(longShotTextOverlayTarget(index), longAutoTextOverlays);
            } catch (e) {
              applyLongShotUpdate(jobProjectId, index, shotLabel, { loading: false, error: `Text overlays: ${String(e?.message || e)}` });
              return;
            }
          }

          // Show the three take slots straight away so the row fills in as the
          // parallel generations land.
          applyLongShotUpdate(jobProjectId, index, shotLabel, {
            loading: true,
            variants: emptyVideoVariants().map((v) => ({ ...v, lastFrameUrl: "" })),
            generatedDuration: longShotDuration(longShots[index] || {}).value,
            // The take of the previous shot whose last frame this shot starts from.
            startedFromTake: index > 0 ? (Number(longShots[index - 1]?.selectedVariant) || 0) : null,
          });
          try {
            const promptTemplatePrefix = "[Image 1] is the start frame. The first frame of the generated video must match [Image 1] exactly. Retain the characters, their facial features and outfits, and preserve the details. ";
            const prevShotVideoRef =
              index > 0
                ? ((longShots[index - 1].videoAssetId ? `asset://${longShots[index - 1].videoAssetId}` : (longShots[index - 1].videoUrl || "")) || null)
                : null;
            const seedRef =
              (shotASeedVideoAssetId ? `asset://${shotASeedVideoAssetId}` : (shotASeedVideoDataUrl || shotASeedSourceUrl || "")) ||
              null;
            const startFrameVideoSource = prevShotVideoRef || (index === 0 ? seedRef : null);
            const extraVideos = index > 0 ? (shot.refVideos || []) : [];

            const videos = extraVideos.map((x) => x.dataUrl).filter(Boolean);
            const extraRefsForShot = shotRefImages;
            let startFrameUrl = index > 0 ? (longShots[index - 1].lastFrameUrl || null) : null;
            if (index === 0 && (shotASeedVideoDataUrl || shotASeedVideoAssetUrl || shotASeedSourceUrl)) {
              try {
                const lf = await fetch("/api/video/extract_last_frame", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ video: shotASeedVideoDataUrl || shotASeedVideoAssetUrl || shotASeedSourceUrl }),
                });
                const lfData = await lf.json();
                if (lf.ok && lfData.image) startFrameUrl = lfData.image;
              } catch (e) {}
            }
            const effectivePrompt = startFrameUrl ? (promptTemplatePrefix + prompt) : prompt;
            const overlayImageCount = textOverlaysForShot.filter((o) => o.image).length;
            const totalImageCount = (startFrameUrl ? 1 : 0) + (effectiveRefs?.length || 0) + extraRefsForShot.length + overlayImageCount;
            if (totalImageCount > shotModelSpec.refs.images) {
              throw new Error(overlayImageCount
                ? `Total reference images (start frame + reference images + uploaded shot images + text overlay images) must be ${shotModelSpec.refs.images} or less for Seedance ${shotModelSpec.label}.`
                : `Total reference images (start frame + reference images + uploaded shot images) must be ${shotModelSpec.refs.images} or less for Seedance ${shotModelSpec.label}.`);
            }
            const res = await fetch("/api/video/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: effectivePrompt,
                skills: projectSkillIdsForGeneration(),
                model: shotModelSpec.id,
                variants: VIDEO_VARIANT_COUNT,
                reference_images: effectiveRefs,
                prompt_reference_images: effectivePromptRefs || effectiveRefs,
                reference_assets: effectiveAssets,
                start_frame_url: startFrameUrl,
                start_from_ref_video_last_frame: !!startFrameUrl && !!startFrameVideoSource,
                extra_reference_images: extraRefsForShot,
                reference_roles_text: (shot.refRoles || "").trim(),
                audios: shotRefAudios,
                videos,
                text_overlays: toTextOverlayPayload(textOverlaysForShot),
                config: {
                  resolution: longResolution,
                  ratio: longRatio,
                  frames_per_second: Number(longFps),
                  duration: durationValue,
                  output_format: shotModelSpec.mov && longOutputFormat === "mov" ? "mov" : "mp4",
                  seed: Number.isFinite(Number(longSeed)) ? Number(longSeed) : -1,
                },
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to start video generation");
            const taskIds = (Array.isArray(data.task_ids) && data.task_ids.length ? data.task_ids : [data.task_id])
              .map((x) => String(x || "").trim())
              .filter(Boolean);
            const generatedPrompt = data.generated_prompt || "";
            if (!taskIds.length) throw new Error("No video task id returned.");
            applyLongShotUpdate(jobProjectId, index, shotLabel, {
              generatedPrompt,
              variants: taskIds.map((taskId) => ({ taskId, status: "queued", url: "", lastFrameUrl: "", error: "", startedAt: Date.now() })),
            });

            // The shot adopts the earliest take that succeeds; the user can
            // switch to another one afterwards.
            let bestIndex = Infinity;
            await Promise.allSettled(taskIds.map((taskId, variantIndex) => {
              const applyVariant = (patch) => applyLongShotVariantUpdate(jobProjectId, index, shotLabel, variantIndex, patch);
              return pollLongShot(taskId, applyVariant).then((task) => {
                const url = task?.video_url || task?.file_url || "";
                if (url && variantIndex < bestIndex) {
                  bestIndex = variantIndex;
                  applyLongShotUpdate(jobProjectId, index, shotLabel, {
                    selectedVariant: variantIndex,
                    videoUrl: url,
                    lastFrameUrl: task?.last_frame_url || "",
                  });
                }
              }).catch((err) => {
                // A take that fails reports it in its own cell; the shot-level
                // error stays for failures that stopped the run from starting.
                applyVariant({ error: String(err?.message || err), status: "" });
              });
            }));
          } catch (e) {
            applyLongShotUpdate(jobProjectId, index, shotLabel, { error: String(e?.message || e) });
          } finally {
            applyLongShotUpdate(jobProjectId, index, shotLabel, { loading: false });
          }
        }

        // The take picked for the combined video (defaults to the shot's selected take).
        function longCombineTake(shot) {
          const pick = longCombinePick[shot.label];
          if (pick === "skip") return null;
          const variants = (shot.variants || []).filter(Boolean);
          const idx = pick !== undefined ? Number(pick) : (Number(shot.selectedVariant) || 0);
          const v = variants[idx];
          if (v && v.url) return { idx, url: v.url };
          return shot.videoUrl ? { idx: Number(shot.selectedVariant) || 0, url: shot.videoAssetUrl || shot.videoUrl } : null;
        }

        async function onCombineLongShots() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = { loading: setLongCombineLoading, url: setLongCombinedUrl, error: setLongCombineError };
          applyProjectJobUpdate(jobProjectId, "longCombineJob", { error: "", url: "" }, setters);
          const readyShots = longShots.filter((s) => s.videoUrl);
          if (readyShots.length < 1) {
            applyProjectJobUpdate(jobProjectId, "longCombineJob", { error: "Generate at least 1 shot first." }, setters);
            return;
          }
          applyProjectJobUpdate(jobProjectId, "longCombineJob", { loading: true }, setters);
          try {
            const urls = [];
            let seedUrl = shotASeedVideoAssetUrl || shotASeedSourceUrl || "";
            if (!seedUrl && shotASeedVideoDataUrl) {
              try {
                const up = await fetch("/api/video/upload_asset", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ video_data_url: shotASeedVideoDataUrl }),
                });
                const upData = await up.json();
                if (up.ok) {
                  const aid = upData.asset_id || "";
                  const aurl = upData.asset_url || "";
                  if (aid) setShotASeedVideoAssetId(aid);
                  if (aurl) {
                    setShotASeedVideoAssetUrl(aurl);
                    seedUrl = aurl;
                  }
                }
              } catch (e) {}
            }
            if (seedUrl) urls.push(seedUrl);
            for (let i = 0; i < longShots.length; i++) {
              const take = longCombineTake(longShots[i]);
              if (take) urls.push(take.url);
            }
            if (urls.length < 2) throw new Error("Need at least 2 videos to combine.");
            const res = await fetch("/api/video/combine", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ video_urls: urls }),
            });
            const raw = await res.text();
            let data = {};
            try {
              data = JSON.parse(raw || "{}");
            } catch (e) {}
            if (!res.ok) throw new Error(data.error || raw || "Failed to combine videos");
            applyProjectJobUpdate(jobProjectId, "longCombineJob", { url: data.file_url || "" }, setters);
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "longCombineJob", { error: String(e?.message || e) }, setters);
          } finally {
            applyProjectJobUpdate(jobProjectId, "longCombineJob", { loading: false }, setters);
          }
        }

        async function onAddCombineVideos(fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;
          setCombineError("");
          const nextItems = [];
          for (const file of files) {
            const videoDataUrl = await readFileAsDataUrl(file);
            const res = await fetch("/api/video/upload_local", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                filename: file.name || "uploaded.mp4",
                video_data_url: videoDataUrl,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to upload video");
            nextItems.push({
              id: genId(),
              name: file.name || "uploaded.mp4",
              url: data.file_url || "",
            });
          }
          setCombineUploads((prev) => [...prev, ...nextItems]);
        }

        function removeCombineUpload(id) {
          setCombineUploads((prev) => prev.filter((item) => item.id !== id));
        }

        async function onCombineUploadedVideos() {
          setCombineError("");
          setCombineResultUrl("");
          if (combineUploads.length < 2) {
            setCombineError("Upload at least 2 videos to combine.");
            return;
          }
          setCombineLoading(true);
          try {
            const res = await fetch("/api/video/combine", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                video_urls: combineUploads.map((item) => new URL(item.url, window.location.origin).href),
              }),
            });
            const raw = await res.text();
            let data = {};
            try { data = JSON.parse(raw); } catch (_) {}
            if (!res.ok) throw new Error(data.error || raw || "Failed to combine videos");
            const finalUrl = data.file_url || "";
            setCombineResultUrl(finalUrl);
            downloadImage(finalUrl, "Combined", "mp4");
          } catch (e) {
            setCombineError(String(e?.message || e));
          } finally {
            setCombineLoading(false);
          }
        }

        async function onAddAudioBlackFiles(fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;
          const nextItems = [];
          for (const file of files) {
            const audioDataUrl = await readFileAsDataUrl(file);
            nextItems.push({
              id: genId(),
              name: file.name || "uploaded-audio",
              audioDataUrl,
              imageDataUrl: "",
              imageName: "",
              loading: false,
              error: "",
              resultUrl: "",
            });
          }
          setAudioBlackUploads((prev) => [...prev, ...nextItems]);
        }

        async function onAddAudioBlackImage(id, file) {
          if (!file) return;
          const imageDataUrl = await readCompatibleImageDataUrl(file);
          updateAudioBlackUpload(id, {
            imageDataUrl,
            imageName: file.name || "cover-image",
          });
        }

        function removeAudioBlackUpload(id) {
          setAudioBlackUploads((prev) => prev.filter((item) => item.id !== id));
        }

        function updateAudioBlackUpload(id, patch) {
          setAudioBlackUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
        }

        async function onGenerateAudioBlackVideo(id) {
          const item = audioBlackUploads.find((i) => i.id === id);
          if (!item) return;
          updateAudioBlackUpload(id, { loading: true, error: "", resultUrl: "" });
          try {
            const res = await fetch("/api/video/audio_black", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audio_data_url: item.audioDataUrl,
                image_data_url: item.imageDataUrl || "",
              }),
            });
            const raw = await res.text();
            let data = {};
            try { data = JSON.parse(raw); } catch (_) {}
            if (!res.ok) throw new Error(data.error || raw || "Failed to generate black-screen video");
            updateAudioBlackUpload(id, {
              loading: false,
              resultUrl: data.file_url || "",
            });
          } catch (e) {
            updateAudioBlackUpload(id, { loading: false, error: String(e?.message || e) });
          }
        }

        async function onAddSkeletonVideos(fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;
          const nextItems = [];
          for (const file of files) {
            const videoDataUrl = await readFileAsDataUrl(file);
            const res = await fetch("/api/video/upload_local", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                filename: file.name || "uploaded.mp4",
                video_data_url: videoDataUrl,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to upload video");
            nextItems.push({
              id: genId(),
              name: file.name || "uploaded.mp4",
              url: data.file_url || "",
              loading: false,
              error: "",
              skeletonUrl: "",
              overlayUrl: "",
            });
          }
          setSkeletonUploads((prev) => [...prev, ...nextItems]);
        }

        function removeSkeletonUpload(id) {
          setSkeletonUploads((prev) => prev.filter((item) => item.id !== id));
        }

        function updateSkeletonUpload(id, patch) {
          setSkeletonUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
        }

        async function onGenerateSkeletonVideo(id) {
          const item = skeletonUploads.find((i) => i.id === id);
          if (!item) return;
          if (!skeletonGenerateSkeleton && !skeletonGenerateOverlay) {
            updateSkeletonUpload(id, { error: "Select at least one output to generate." });
            return;
          }
          updateSkeletonUpload(id, { loading: true, error: "" });
          try {
            const res = await fetch("/api/skeleton/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                video_url: new URL(item.url, window.location.origin).href,
                mode: skeletonMode,
                kpt_thr: Number(skeletonKptThr),
                all_people: skeletonAllPeople,
                generate_skeleton: skeletonGenerateSkeleton,
                generate_overlay: skeletonGenerateOverlay,
              }),
            });
            const raw = await res.text();
            let data = {};
            try { data = JSON.parse(raw); } catch (_) {}
            if (!res.ok) throw new Error(data.error || raw || "Failed to generate skeleton reference");
            updateSkeletonUpload(id, {
              loading: false,
              skeletonUrl: data.skeleton_url || "",
              overlayUrl: data.overlay_url || "",
            });
          } catch (e) {
            updateSkeletonUpload(id, { loading: false, error: String(e?.message || e) });
          }
        }

        function nextShotLabel(n) {
          if (n < 26) return `SHOT ${String.fromCharCode(65 + n)}`;
          return `SHOT ${n + 1}`;
        }

        function newLongShot(label) {
          return { label, prompt: "", loading: false, variants: [], selectedVariant: 0, videoUrl: "", videoAssetId: "", videoAssetUrl: "", lastFrameUrl: "", generatedPrompt: "", error: "", refImages: [], refImageError: "", refAudios: [], refAudioError: "", refVideos: [], refVideoError: "", textOverlay: defaultTextOverlayState() };
        }

        function onAddLongShot() {
          setLongShots((prev) => {
            const label = nextShotLabel(prev.length);
            setLongExpanded((exp) => ({ ...exp, [label]: true }));
            return [...prev, newLongShot(label)];
          });
        }

        function onScriptPdfSelected(fileList) {
          const picked = Array.from(fileList || []).find((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf") || null;
          setScriptPdfFile(picked);
          if (!picked) {
            setScriptPromptError("Please select a PDF file.");
          } else {
            setScriptPromptError("");
          }
        }

        async function onGenerateScriptToPrompt() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = { loading: setScriptPromptLoading, output: setScriptPromptOutput, error: setScriptPromptError };
          applyProjectJobUpdate(jobProjectId, "scriptJob", { error: "", output: "" }, setters);
          if (!scriptSourceText.trim() && !scriptPdfFile) {
            applyProjectJobUpdate(jobProjectId, "scriptJob", { error: "Paste a script or upload a PDF." }, setters);
            return;
          }
          applyProjectJobUpdate(jobProjectId, "scriptJob", { loading: true }, setters);
          const setScriptCharacters = seedreamUpdater("scriptCharacters");
          const setScriptLocations = seedreamUpdater("scriptLocations");
          try {
            const fd = new FormData();
            if (scriptSourceText.trim()) fd.append("script_text", scriptSourceText.trim());
            if (scriptPdfFile) fd.append("script_pdf", scriptPdfFile, scriptPdfFile.name);
            const res = await fetch("/api/script-to-prompt", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to generate prompts");
            applyProjectJobUpdate(jobProjectId, "scriptJob", { output: data.prompts || "" }, setters);
            setScriptCharacters(() => ({ items: data.characters || [] }));
            setScriptLocations(() => ({ items: data.locations || [] }));
            // Map the results straight into the next tools (nothing is generated yet).
            if ((data.characters || []).length) sendScriptCharactersToSheets(data.characters, { open: false });
            if ((data.locations || []).length) sendScriptLocationsToVariations(data.locations, { open: false });
            fillLongShotsFromScript(data.prompts || "");
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "scriptJob", { error: String(e?.message || e) }, setters);
          } finally {
            applyProjectJobUpdate(jobProjectId, "scriptJob", { loading: false }, setters);
          }
        }

        // Script to Prompt → Character Sheets: each description becomes a character card. A card
        // with the same name is updated in place (unless its sheet is already made or running).
        function sendScriptCharactersToSheets(items, { open = true } = {}) {
          const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
          seedreamUpdater("sheetBatch")((prev) => {
            let current = ((prev && prev.characters) || []).filter((c) => c.refs.length || c.notes.trim() || c.image || c.busy);
            const added = [];
            items.forEach((it, i) => {
              const existing = current.find((c) => same(c.name, it.name));
              if (existing) {
                if (!existing.image && !existing.busy) current = current.map((c) => (c === existing ? { ...c, notes: it.description } : c));
                return;
              }
              added.push({
                id: `c${Date.now().toString(36)}${i}`, name: it.name, refs: [], notes: it.description, bible: null,
                jobId: "", qa: null, image: "", error: "", busy: "",
              });
            });
            return { ...(prev || {}), characters: [...current, ...added] };
          });
          if (open) openToolByKey("character-sheets");
        }

        // Script to Prompt → Long Duration: shot n's prompt goes into shot n. A shot you have
        // written or edited yourself is left alone; one still holding an earlier script fill is updated.
        function fillLongShotsFromScript(prompts) {
          const bodies = parseScriptPromptShots(prompts).map(scriptShotBody).filter(Boolean);
          if (!bodies.length) return;
          setLongShots((prev) => {
            const next = [...prev];
            bodies.forEach((body, i) => {
              while (next.length <= i) next.push(newLongShot(nextShotLabel(next.length)));
              const cur = next[i];
              if ((cur.prompt || "").trim() && cur.prompt !== cur.scriptPrompt) return;
              next[i] = { ...cur, prompt: body, scriptPrompt: body, error: "", duration: 0 };
            });
            return autoMapLongShots(next, longSharedPool);
          });
        }

        // Script to Prompt → Location Variations: each location becomes its own card (name + direction).
        function sendScriptLocationsToVariations(locs, { open = true } = {}) {
          const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
          seedreamUpdater("locationVariations")((prev) => {
            let current = ((prev && prev.locations) || []).filter((l) => (l.images || []).length || (l.direction || "").trim() || (l.items || []).length || l.stage);
            const added = [];
            locs.forEach((l, i) => {
              const existing = current.find((x) => same(x.name, l.name));
              if (existing) {
                if (!(existing.items || []).length && !existing.stage) current = current.map((x) => (x === existing ? { ...x, direction: l.direction } : x));
                return;
              }
              added.push({
                id: `loc${Date.now().toString(36)}${i}`, name: l.name, images: [], direction: l.direction, count: 4,
                source: "", anchor: false, items: [], stage: "", error: "",
              });
            });
            return { locations: [...current, ...added] };
          });
          if (open) openToolByKey("location-variations");
        }

        async function onWbAddRefImages(fileList) {
          const files = Array.from(fileList);
          const loaded = await loadReferenceImagesForProject(files, "storyboard-ref");
          setWbRefImages((prev) => [...prev, ...loaded].slice(0, 4));
        }

        async function onWbGeneratePrompts() {
          const jobProjectId = (activeSection === "projects" && activeProjectId) ? activeProjectId : null;
          const setters = { promptsLoading: setWbPromptsLoading, generateLoading: setWbGenerateLoading, promptText: setWbPromptText, storyboardImage: setWbStoryboardImage, error: setWbError };
          applyProjectJobUpdate(jobProjectId, "storyboardJob", { error: "" }, setters);
          const hasAnyInput = wbScript.trim() || wbSubject.trim() || wbAction.trim() || wbEnvironment.trim() || wbLighting.trim() || wbCamera.trim() || wbStyle.trim() || wbQuality.trim() || wbRefImages.length;
          if (!hasAnyInput) {
            applyProjectJobUpdate(jobProjectId, "storyboardJob", { error: "Paste a script or fill in at least one core element to generate a storyboard." }, setters);
            return;
          }
          applyProjectJobUpdate(jobProjectId, "storyboardJob", { promptsLoading: true, generateLoading: false, promptText: "", storyboardImage: "" }, setters);
          try {
            const resp = await fetch("/api/storyboard/prompt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                script: wbScript,
                subject: wbSubject,
                action: wbAction,
                environment: wbEnvironment,
                lighting: wbLighting,
                camera: wbCamera,
                style: wbStyle,
                quality: wbQuality,
                referenceImages: wbRefImages.map((r) => r.dataUrl),
              }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to generate storyboard prompt");
            applyProjectJobUpdate(jobProjectId, "storyboardJob", { promptText: data.prompt || "" }, setters);

            applyProjectJobUpdate(jobProjectId, "storyboardJob", { generateLoading: true }, setters);
            const frameResp = await fetch("/api/storyboard/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: data.prompt || "",
                referenceImages: wbRefImages.map((r) => r.dataUrl),
              }),
            });
            const frameData = await frameResp.json();
            if (!frameResp.ok) throw new Error(frameData.error || "Failed to generate storyboard image");
            applyProjectJobUpdate(jobProjectId, "storyboardJob", { storyboardImage: frameData.image || "" }, setters);
          } catch (e) {
            applyProjectJobUpdate(jobProjectId, "storyboardJob", { error: e.message || String(e) }, setters);
          } finally {
            applyProjectJobUpdate(jobProjectId, "storyboardJob", { promptsLoading: false, generateLoading: false }, setters);
          }
        }

        async function onWbAddRefVideos(fileList) {
          const files = Array.from(fileList);
          const loaded = await Promise.all(files.map(async (f) => {
            const dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.readAsDataURL(f);
            });
            return { name: f.name, dataUrl, origin: "upload" };
          }));
          setWbRefVideos((prev) => [...prev, ...loaded].slice(0, 4));
        }

        const sheetSelectedCount = Object.keys(sheetSelections).filter((k) => sheetSelections[k]).length;
        // With no reference image the sheet is generated from the notes as a description (Character Sheet Studio flow).
        const sheetHasRefs = files.length > 0 || (useT2IForSheets && !!t2iImage) || (useI2IForSheets && !!i2iImage);
        const disabled =
          loading ||
          sheetSelectedCount === 0 ||
          (!sheetHasRefs && sheetNotes.trim().length < 3);
        const hasSheetsForVideo = !!images.instruction_1;
        const hasT2IForVideo = !!t2iImage;
        const hasI2IForVideo = !!i2iImage;
        const parsedScriptPromptShots = parseScriptPromptShots(scriptPromptOutput);
        const longModelSpec = getVideoModelSpec(longModel);
        const longReadyShotsCount = longShots.filter((s) => !!longCombineTake(s)).length;
        const hasLongSeedVideo = !!shotASeedVideoDataUrl || !!shotASeedVideoAssetUrl;
        const longCombineVideoCount = longReadyShotsCount + (hasLongSeedVideo ? 1 : 0);

        const videoDisabledHint = (() => {
          if (videoLoading || loading) return "";
          if (!videoPrompt.trim()) return "Enter a video prompt to enable video generation.";
          if (useI2IForVideoAll && !hasI2IForVideo) return "Generate an image-to-image character first to use it directly for video.";
          if (useT2IForVideoAll && !hasT2IForVideo) return "Generate a text-to-image character first to use it directly for video.";
          if (!hasSheetsForVideo && !hasT2IForVideo && !hasI2IForVideo) return "Generate character sheets, or generate a T2I/I2I character.";
          return "";
        })();

        // Every Video Generation panel — the original plus any duplicates made
        // with its "+" — is rendered from one shape, so a duplicate behaves
        // exactly like the original. The original keeps writing to the flat
        // component state the rest of the app reads (Long Duration seeding,
        // project results, character linking); duplicates own their state
        // inside videoClones.
        const mainVideoFieldSetters = {
          outputFormat: setVideoOutputFormat,
          prompt: setVideoPrompt,
          draftTaskId: setVideoDraftTaskId,
          draftMode: setVideoDraftMode,
          extraRefImages: setVideoExtraRefImages,
          refUploadError: setVideoRefUploadError,
          audioRefs: setVideoAudioRefs,
          audioUploadError: setVideoAudioUploadError,
          refVideos: setVideoRefVideos,
          refVideoUploadError: setVideoRefVideoUploadError,
          model: setVideoModel,
          resolution: setVideoResolution,
          ratio: setVideoRatio,
          duration: setVideoDuration,
          smartLength: setVideoSmartLength,
          fps: setVideoFps,
          loading: setVideoLoading,
          variants: setVideoVariants,
          selectedVariant: setVideoSelectedVariant,
          url: setVideoUrl,
          error: setVideoError,
          generatedPrompt: setVideoGeneratedPrompt,
          textOverlay: setVideoTextOverlay,
          autoTextOverlays: setVideoAutoTextOverlays,
        };
        const videoPanels = [
          {
            id: "main",
            isMain: true,
            title: "Video Generation",
            prompt: videoPrompt,
            draftTaskId: videoDraftTaskId,
            draftMode: videoDraftMode,
            extraRefImages: videoExtraRefImages,
            refUploadError: videoRefUploadError,
            audioRefs: videoAudioRefs,
            audioUploadError: videoAudioUploadError,
            refVideos: videoRefVideos,
            refVideoUploadError: videoRefVideoUploadError,
            model: videoModel,
            resolution: videoResolution,
            ratio: videoRatio,
            duration: videoDuration,
            smartLength: videoSmartLength,
            fps: videoFps,
            outputFormat: videoOutputFormat,
            loading: videoLoading,
            variants: videoVariants,
            selectedVariant: videoSelectedVariant,
            url: videoUrl,
            error: videoError,
            generatedPrompt: videoGeneratedPrompt,
            textOverlay: videoTextOverlay,
            autoTextOverlays: videoAutoTextOverlays,
            set: (field, value) => {
              const setter = mainVideoFieldSetters[field];
              if (setter) setter(value);
            },
          },
          ...(videoClones || []).map((clone, idx) => ({
            ...defaultVideoClone(),
            ...clone,
            isMain: false,
            title: `Video Generation ${idx + 2}`,
            set: (field, value) => setVideoCloneField(clone.id, field, value),
          })),
        ];
        // Seedance runs take minutes — 2.5 has taken up to ~16 on this account —
        // so every in-flight variation shows its own elapsed time. Without it
        // there is no way to tell a slow generation from a stuck one. The tick
        // only runs while something is actually generating.
        const [elapsedTick, setElapsedTick] = useState(0);
        const anyVideoGenerating =
          videoLoading
          || (videoClones || []).some((clone) => clone.loading)
          || (longShots || []).some((shot) => shot.loading);
        useEffect(() => {
          if (!anyVideoGenerating) return;
          const id = setInterval(() => setElapsedTick((t) => t + 1), 1000);
          return () => clearInterval(id);
        }, [anyVideoGenerating]);

        // Generation time of a finished video task, from the server's own timestamps (seconds).
        function taskGenSeconds(task) {
          const c = Number(task?.created_at), u = Number(task?.updated_at);
          return c > 0 && u >= c ? u - c : 0;
        }
        function formatDuration(secs) {
          secs = Math.max(0, Math.round(Number(secs) || 0));
          const mins = Math.floor(secs / 60);
          return mins ? `${mins}m ${String(secs % 60).padStart(2, "0")}s` : `${secs}s`;
        }
        // A variation's generation time: server timestamps, else when the browser saw it start and finish.
        function variantGenSeconds(v) {
          if (Number(v?.genSeconds) > 0) return Number(v.genSeconds);
          if (v?.startedAt && v?.finishedAt) return (Number(v.finishedAt) - Number(v.startedAt)) / 1000;
          return 0;
        }
        function formatElapsed(startedAt) {
          if (!startedAt) return "";
          const secs = Math.max(0, Math.round((Date.now() - Number(startedAt)) / 1000));
          const mins = Math.floor(secs / 60);
          return mins ? `${mins}m ${String(secs % 60).padStart(2, "0")}s` : `${secs}s`;
        }

        // Persist projects to the server. Drafts change on every keystroke, so
        // the write is debounced; the payload is the whole list, written
        // atomically server-side. A failure is surfaced rather than swallowed —
        // silently dropping this write is exactly how projects used to go
        // missing.
        const projectsSaveTimerRef = useRef(null);
        useEffect(() => {
          if (!projectsLoaded) return;
          if (projectsSaveTimerRef.current) clearTimeout(projectsSaveTimerRef.current);
          projectsSaveTimerRef.current = setTimeout(() => {
            fetch("/api/projects/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projects }),
            })
              .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || `Failed to save projects (HTTP ${res.status})`);
                setProjectsSaveError("");
              })
              .catch((e) => setProjectsSaveError(`Projects could not be saved: ${String(e?.message || e)}`));
          }, 700);
          return () => {
            if (projectsSaveTimerRef.current) clearTimeout(projectsSaveTimerRef.current);
          };
        }, [projects, projectsLoaded]);

        const PROJECT_TYPES = [
          { key: "short-drama", label: "Short Drama" },
          { key: "ad-commercial", label: "Ad Commercial" },
          { key: "product-catalogue", label: "Product Catalogue" },
          { key: "music-video", label: "Music Video" },
          { key: "social-content", label: "Social Content" },
          { key: "text-overlay", label: "Text Overlay" },
          { key: "seed-audio", label: "Seed Audio" },
          { key: "audiobook", label: "Audiobook" },
          { key: "hybrid-studio", label: "Hybrid Studio" },
          { key: "seedream", label: "Seedream" },
          { key: "custom", label: "Custom" },
        ];

        const PROJECT_TYPE_START_TOOL = { audiobook: "audiobook", "hybrid-studio": "hybrid-studio", seedream: "seedream-image" };

        // Project-results key for each Seedream tool.
        const SEEDREAM_TOOL_STATE = { "seedream-image": "seedreamImage", "seedream-layers": "seedreamLayers", "seedream-edit": "seedreamEdit" };

        // Script to Prompt is always first: its character, location and shot prompts feed the rest.
        const PROJECT_TOOLS = [
          { key: "script-to-prompt", label: "Script to Prompt", icon: "file" },
          { key: "character-generation", label: "Character Generation", icon: "user" },
          { key: "character-sheets", label: "Character Sheets", icon: "grid" },
          { key: "location-variations", label: "Location Variations", icon: "image" },
          { key: "storyboard", label: "Storyboard", icon: "layout" },
          { key: "previz", label: "Previz", icon: "layout" },
          { key: "seedream-image", label: "Seedream Image Generation", icon: "image" },
          { key: "character-masking", label: "Character Masking", icon: "user" },
          { key: "video-generation", label: "Video Generation", icon: "video" },
          { key: "long-duration", label: "Long Duration", icon: "film" },
          { key: "seed-audio", label: "Seed Audio", icon: "audio" },
          { key: "video-enhancer", label: "Video Enhancer", icon: "sparkles" },
          // Not in the main pipeline; listed after it.
          { key: "video-editor", label: "Video Editor", icon: "scissors" },
          { key: "visual-understanding", label: "Visual Understanding", icon: "eye" },
          { key: "canvas", label: "Canvas", icon: "grid" },
        ];

        // Project tools for "Seedream" type projects: image generation, character generation, layer separation and interactive edit.
        const SEEDREAM_TOOLS = [
          { key: "seedream-image", label: "Seedream Image Generation", icon: "image" },
          { key: "character-generation", label: "Character Generation", icon: "user" },
          { key: "seedream-layers", label: "Layer Separation", icon: "layers" },
          { key: "seedream-edit", label: "Interactive Edit", icon: "edit" },
        ];

        // Project tools for "Hybrid Studio" type projects.
        const HYBRID_STUDIO_TOOLS = [
          { key: "hybrid-studio", label: "Hybrid Studio", icon: "video" },
        ];

        // Project tools for "Seed Audio" type projects: the Seed Audio studio
        // (speech, voice cloning, dubbing, translation, stem separation), plus
        // Video Generation so a project can make the videos it then dubs.
        const SEED_AUDIO_TOOLS = [
          { key: "seed-audio", label: "Seed Audio", icon: "audio" },
          { key: "video-generation", label: "Video Generation", icon: "video" },
        ];

        // Project tools for "Audiobook" type projects: the Audiobook Creator (opened
        // automatically when the project is created) plus Seed Audio for one-off
        // voice tests, sample clips and edits.
        const AUDIOBOOK_TOOLS = [
          { key: "audiobook", label: "Audiobook Creator", icon: "book" },
          { key: "seed-audio", label: "Seed Audio", icon: "audio" },
        ];


        const sessionAssets = useMemo(() => {
          const assets = [];
          if (t2iImage) assets.push({ key: "t2i", type: "image", url: t2iImage, name: "Character (T2I)" });
          if (i2iImage) assets.push({ key: "i2i", type: "image", url: i2iImage, name: "Character (I2I)" });
          if (images.instruction_1) assets.push({ key: "sheet_1", type: "image", url: images.instruction_1, name: "Character Sheet" });
          if (wbStoryboardImage) assets.push({ key: "storyboard", type: "image", url: wbStoryboardImage, name: "Storyboard" });
          (videoVariants || []).forEach((variant, i) => {
            if (variant.url) assets.push({ key: `video_main_${i}`, type: "video", url: variant.url, name: `Generated Video — Variation ${i + 1}` });
          });
          if (!(videoVariants || []).some((v) => v.url) && videoUrl) {
            assets.push({ key: "video_main", type: "video", url: videoUrl, name: "Generated Video" });
          }
          (videoClones || []).forEach((clone, i) => {
            (clone.variants || []).forEach((variant, j) => {
              if (variant.url) assets.push({ key: `video_clone_${clone.id}_${j}`, type: "video", url: variant.url, name: `Generated Video ${i + 2} — Variation ${j + 1}` });
            });
          });
          longShots.forEach((s, i) => {
            if (s.videoUrl) assets.push({ key: `long_${i}`, type: "video", url: s.videoUrl, name: s.label || `Shot ${i + 1}` });
          });
          return assets;
        }, [t2iImage, i2iImage, images.instruction_1, wbStoryboardImage, videoUrl, videoVariants, videoClones, longShots]);

        const pickerAssets = useMemo(() => {
          if (!assetPickerTarget) return [];
          if (assetPickerTarget.mode === "video-group-references" || assetPickerTarget.mode === "long-shot-group-references") {
            const group = getProjectGroup(assetPickerTarget.projectId, assetPickerTarget.groupId);
            return (group?.items || []).map((item) => ({
              key: item.assetId || item.id,
              type: item.type,
              url: item.url,
              name: item.name,
            }));
          }
          return sessionAssets;
        }, [assetPickerTarget, projects, sessionAssets]);

        const assetPickerTitle = (assetPickerTarget?.mode === "video-group-references" || assetPickerTarget?.mode === "long-shot-group-references")
          ? "Select Asset Group References"
          : "Select Session Assets";
        const assetPickerEmptyLines = (assetPickerTarget?.mode === "video-group-references" || assetPickerTarget?.mode === "long-shot-group-references")
          ? ["No assets in this project group yet.", "Upload images or videos into the asset group first."]
          : ["No assets generated yet in this session.", "Use the tools to generate images or videos first."];
        const assetPickerConfirmLabel = (assetPickerTarget?.mode === "video-group-references" || assetPickerTarget?.mode === "long-shot-group-references")
          ? "Use as References"
          : "Add to Group";

        function genId() {
          return Date.now().toString(36) + Math.random().toString(36).slice(2);
        }

        function slugifyProjectName(name) {
          const slug = (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          return slug || "project";
        }

        // The on-disk Local Folder must be named after the project as shown
        // in the UI, not the random internal id — folderSlug is computed
        // once at creation time (with a numeric suffix if another project
        // already claimed that name) and stays stable even if the project
        // is later renamed, so files already saved under it stay reachable.
        function uniqueProjectFolderSlug(name, existingProjects) {
          const base = slugifyProjectName(name);
          const taken = new Set((existingProjects || []).map((p) => p.folderSlug).filter(Boolean));
          if (!taken.has(base)) return base;
          let n = 2;
          while (taken.has(`${base}-${n}`)) n += 1;
          return `${base}-${n}`;
        }

        function getProjectFolderSlug(projectId) {
          const project = projects.find((p) => p.id === projectId);
          // Projects created after this fix always have folderSlug set at
          // creation time (see createProject). Older projects — created
          // before folderSlug existed — keep using their original id as the
          // folder name, because that's where their already-saved local
          // files actually live on disk; silently switching them to a
          // name-derived slug would orphan real generated videos/images.
          return project?.folderSlug || projectId;
        }

        function createProject() {
          if (!newProjectName.trim()) return;
          const id = genId();
          const folderSlug = uniqueProjectFolderSlug(newProjectName, projects);
          setProjects((prev) => [...prev, {
            id,
            name: newProjectName.trim(),
            folderSlug,
            type: newProjectType,
            // Opt-in: the Seedance 2.5 Optimizer is always applied; other skills are ticked per project.
            skills: [],
            skillsOptIn: true,
            createdAt: Date.now(),
            assetGroups: [],
            drafts: defaultProjectDrafts(),
            results: defaultProjectResults(),
            // Single-purpose projects open straight into their tool.
            usedTools: PROJECT_TYPE_START_TOOL[newProjectType] ? [PROJECT_TYPE_START_TOOL[newProjectType]] : [],
            collapsedTools: {},
          }]);
          fetch("/api/projects/create_folder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: folderSlug }),
          }).catch(() => {});
          setNewProjectName("");
          setNewProjectType("short-drama");
          setShowNewProjectModal(false);
          setActiveProjectId(id);
          setActiveProjectTool(PROJECT_TYPE_START_TOOL[newProjectType] || "");
        }

        function deleteProject(id) {
          setProjects((prev) => prev.filter((p) => p.id !== id));
          if (activeProjectId === id) setActiveProjectId(null);
        }

        // Inline rename, used on the project cards and the project page title.
        const [renaming, setRenaming] = useState({ id: null, draft: "" });
        function saveProjectName() {
          const name = renaming.draft.trim();
          if (renaming.id && name) {
            setProjects((prev) => (prev.some((p) => p.id === renaming.id && p.name !== name)
              ? prev.map((p) => (p.id === renaming.id ? { ...p, name } : p))
              : prev));
          }
          setRenaming({ id: null, draft: "" });
        }
        function renameButton(proj) {
          return (
            <button className="proj-rename-btn" title="Rename project" aria-label="Rename project"
              onClick={(e) => { e.stopPropagation(); setRenaming({ id: proj.id, draft: proj.name || "" }); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
              </svg>
            </button>
          );
        }
        function renderProjectName(proj, className, withButton) {
          if (renaming.id === proj.id) {
            return (
              <input className={"video-input proj-rename-input " + className} autoFocus value={renaming.draft} maxLength={120}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setRenaming({ id: proj.id, draft: e.target.value })}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") saveProjectName();
                  if (e.key === "Escape") setRenaming({ id: null, draft: "" });
                }}
                onBlur={saveProjectName} />
            );
          }
          return (
            <div className={"proj-name-row " + className}>
              <span>{proj.name}</span>
              {withButton ? renameButton(proj) : null}
            </div>
          );
        }

        async function createAssetGroup(projectId) {
          if (!newGroupName.trim()) return;
          setProjectAssetGroupError("");
          setCreatingGroupForProjectId(projectId);
          try {
            const project = projects.find((p) => p.id === projectId);
            if ((project?.assetGroups || []).length >= 1) {
              throw new Error("Each project can have only one asset group.");
            }
            const groupName = newGroupName.trim();
            const res = await fetch("/api/assets/create_group", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: groupName,
                description: `Project asset group for ${groupName}`,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create asset group");
            const groupId = data.group_id || "";
            if (!groupId) throw new Error("No group id returned.");
            setProjects((prev) => prev.map((p) => {
              if (p.id !== projectId) return p;
              return {
                ...p,
                assetGroups: [
                  ...(p.assetGroups || []),
                  { id: groupId, backendGroupId: groupId, name: groupName, items: [] },
                ],
              };
            }));
            setNewGroupName("");
            setAddingGroupForProjectId(null);
          } catch (e) {
            setProjectAssetGroupError(String(e?.message || e));
          } finally {
            setCreatingGroupForProjectId(null);
          }
        }

        function deleteAssetGroup(projectId, groupId) {
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            return { ...p, assetGroups: (p.assetGroups || []).filter((g) => g.id !== groupId) };
          }));
        }

        function removeAssetFromGroup(projectId, groupId, itemId) {
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            return { ...p, assetGroups: (p.assetGroups || []).map((g) => {
              if (g.id !== groupId) return g;
              return { ...g, items: (g.items || []).filter((it) => it.id !== itemId) };
            }) };
          }));
        }

        function openAssetPicker(projectId, groupId) {
          setAssetPickerTarget({ mode: "add-to-group", projectId, groupId });
          setAssetPickerSelected({});
          setAssetPickerOpen(true);
        }

        function getProjectGroup(projectId, groupId = "") {
          const project = projects.find((p) => p.id === projectId);
          if (!project) return null;
          if (groupId) {
            return (project.assetGroups || []).find((g) => g.id === groupId) || null;
          }
          return (project.assetGroups || [])[0] || null;
        }

        function nextAssetOrdinal(group) {
          const nums = (group?.items || [])
            .map((item) => {
              const match = String(item?.name || "").trim().match(/^asset\s+(\d+)$/i);
              return match ? Number(match[1]) : 0;
            })
            .filter((value) => Number.isFinite(value) && value > 0);
          return (nums.length ? Math.max(...nums) : 0) + 1;
        }

        function getVideoSubmittedReferenceValue(item) {
          const raw = String(item?.assetId || item?.dataUrl || item?.assetUrl || "").trim();
          if (!raw) return "";
          if (raw.startsWith("asset://") || raw.startsWith("http") || raw.startsWith("data:")) return raw;
          return `asset://${raw}`;
        }

        function getVideoPromptImageValue(item) {
          return String(item?.assetUrl || item?.dataUrl || "").trim();
        }

        function getVideoReferencePreviewLabel(item) {
          const value = getVideoSubmittedReferenceValue(item);
          if (!value) return "";
          if (value.startsWith("data:")) {
            return `${value.slice(0, 48)}...`;
          }
          return value;
        }

        // `inst` is the Video Generation panel the picker was opened from — the
        // original, or one of its duplicates, so the chosen assets land back in
        // that panel's own references.
        function openProjectAssetReferencePicker(projectId, inst) {
          const group = getProjectGroup(projectId);
          if (!group) {
            inst.set("refUploadError", "Create the project's asset group first.");
            return;
          }
          const selected = {};
          (inst.extraRefImages || [])
            .filter((item) => item?.origin === "group")
            .forEach((item) => {
              const key = item?.assetId || item?.id;
              if (key) selected[key] = true;
            });
          (inst.refVideos || [])
            .filter((item) => item?.origin === "group")
            .forEach((item) => {
              const key = item?.assetId || item?.id;
              if (key) selected[key] = true;
            });
          setAssetPickerTarget({ mode: "video-group-references", projectId, groupId: group.id, videoPanelId: inst.id });
          setAssetPickerSelected(selected);
          setAssetPickerOpen(true);
        }

        function openLongShotAssetReferencePicker(projectId, shotIndex) {
          const group = getProjectGroup(projectId);
          if (!group) {
            updateLongShot(shotIndex, { refImageError: "Create the project's asset group first." });
            return;
          }
          const shot = longShots[shotIndex] || {};
          const selected = {};
          (shot.refImages || [])
            .filter((item) => item?.origin === "group")
            .forEach((item) => {
              const key = item?.assetId || item?.id;
              if (key) selected[key] = true;
            });
          if (shotIndex > 0) {
            (shot.refVideos || [])
              .filter((item) => item?.origin === "group")
              .forEach((item) => {
                const key = item?.assetId || item?.id;
                if (key) selected[key] = true;
              });
          } else if (shotASeedSource === "group" && shotASeedVideoAssetId) {
            selected[shotASeedVideoAssetId] = true;
          }
          setAssetPickerTarget({ mode: "long-shot-group-references", projectId, groupId: group.id, shotIndex });
          setAssetPickerSelected(selected);
          setAssetPickerOpen(true);
        }

        function confirmAssetPicker() {
          if (!assetPickerTarget) return;
          const { mode, projectId, groupId } = assetPickerTarget;
          if (mode === "video-group-references") {
            const group = getProjectGroup(projectId, groupId);
            const selectedItems = (group?.items || []).filter((item) => {
              const key = item.assetId || item.id;
              return !!assetPickerSelected[key];
            });
            const selectedImages = selectedItems
              .filter((item) => item.type === "image")
              .map((item) => ({
                id: item.id,
                assetId: item.assetId || item.id,
                assetUrl: item.url,
                dataUrl: item.url,
                name: item.name,
                origin: "group",
              }));
            const selectedVideos = selectedItems
              .filter((item) => item.type === "video")
              .map((item) => ({
                id: item.id,
                assetId: item.assetId || item.id,
                assetUrl: item.url,
                dataUrl: item.url,
                name: item.name,
                duration: 0,
                origin: "group",
              }));
            const panelId = assetPickerTarget?.videoPanelId || "main";
            const mergeGroupSelection = (prev, incoming) => [
              ...(prev || []).filter((item) => item?.origin !== "group"),
              ...incoming,
            ];
            if (panelId === "main") {
              setVideoExtraRefImages((prev) => mergeGroupSelection(prev, selectedImages));
              setVideoRefVideos((prev) => mergeGroupSelection(prev, selectedVideos));
            } else {
              setVideoClones((prev) => prev.map((clone) => (clone.id !== panelId ? clone : {
                ...clone,
                extraRefImages: mergeGroupSelection(clone.extraRefImages, selectedImages),
                refVideos: mergeGroupSelection(clone.refVideos, selectedVideos),
              })));
            }
            setAssetPickerOpen(false);
            setAssetPickerTarget(null);
            setAssetPickerSelected({});
            return;
          }
          if (mode === "long-shot-group-references") {
            const group = getProjectGroup(projectId, groupId);
            const shotIndex = Number(assetPickerTarget?.shotIndex || 0);
            const selectedItems = (group?.items || []).filter((item) => {
              const key = item.assetId || item.id;
              return !!assetPickerSelected[key];
            });
            const selectedImages = selectedItems
              .filter((item) => item.type === "image")
              .map((item) => ({
                id: item.id,
                assetId: item.assetId || item.id,
                assetUrl: item.url,
                dataUrl: item.assetId || item.id,
                name: item.name,
                origin: "group",
              }));
            setLongShots((prev) => prev.map((shot, idx) => {
              if (idx !== shotIndex) return shot;
              const keptImages = (shot.refImages || []).filter((item) => item?.origin !== "group");
              return { ...shot, refImages: [...keptImages, ...selectedImages], refImageError: "" };
            }));

            if (shotIndex === 0) {
              const seedVideo = selectedItems.find((item) => item.type === "video");
              if (seedVideo) {
                setShotASeedError("");
                setShotASeedVideoName(seedVideo.name || "Group video");
                setShotASeedVideoDataUrl("");
                setShotASeedVideoAssetId(seedVideo.assetId || seedVideo.id || "");
                setShotASeedVideoAssetUrl(seedVideo.url || "");
                setShotASeedSource("group");
                setShotASeedSourceUrl(seedVideo.url || "");
              } else if (shotASeedSource === "group") {
                setShotASeedVideoName("");
                setShotASeedVideoDataUrl("");
                setShotASeedVideoAssetId("");
                setShotASeedVideoAssetUrl("");
                setShotASeedSource("");
                setShotASeedSourceUrl("");
              }
            } else {
              const selectedVideos = selectedItems
                .filter((item) => item.type === "video")
                .map((item) => ({
                  id: item.id,
                  assetId: item.assetId || item.id,
                  assetUrl: item.url,
                  dataUrl: item.assetId || item.id,
                  name: item.name,
                  duration: 0,
                  origin: "group",
                }));
              setLongShots((prev) => prev.map((shot, idx) => {
                if (idx !== shotIndex) return shot;
                const keptVideos = (shot.refVideos || []).filter((item) => item?.origin !== "group");
                return { ...shot, refVideos: [...keptVideos, ...selectedVideos], refVideoError: "" };
              }));
            }
            setAssetPickerOpen(false);
            setAssetPickerTarget(null);
            setAssetPickerSelected({});
            return;
          }

          const toAdd = sessionAssets.filter((a) => assetPickerSelected[a.key]);
          if (!toAdd.length) return;
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            return { ...p, assetGroups: (p.assetGroups || []).map((g) => {
              if (g.id !== groupId) return g;
              const existingUrls = new Set((g.items || []).map((it) => it.url));
              const newItems = toAdd
                .filter((a) => !existingUrls.has(a.url))
                .map((a) => ({ id: genId(), type: a.type, url: a.url, name: a.name }));
              return { ...g, items: [...(g.items || []), ...newItems] };
            }) };
          }));
          setAssetPickerOpen(false);
          setAssetPickerTarget(null);
          setAssetPickerSelected({});
        }

        async function uploadFilesToGroup(projectId, groupId, fileList) {
          const files = Array.from(fileList || []);
          if (!files.length) return;
          setProjectAssetGroupError("");
          const group = getProjectGroup(projectId, groupId);
          if (!group) {
            throw new Error("Asset group not found.");
          }
          let seq = nextAssetOrdinal(group);
          const newItems = [];
          for (const f of files) {
            const isVideo = (f.type || "").startsWith("video/");
            const dataUrl = isVideo ? await readFileAsDataUrl(f) : await readCompatibleImageDataUrl(f);
            const assetName = `Asset ${seq}`;
            const res = await fetch("/api/assets/add_to_group", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                group_id: groupId,
                data_url: dataUrl,
                key_hint: `asset-${seq}`,
                asset_type: isVideo ? "Video" : "Image",
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to upload ${assetName}`);
            newItems.push({
              id: data.asset_id || genId(),
              assetId: data.asset_id || "",
              type: isVideo ? "video" : "image",
              url: data.asset_url || dataUrl,
              name: assetName,
            });
            seq += 1;
          }
          setProjects((prev) => prev.map((p) => {
            if (p.id !== projectId) return p;
            return { ...p, assetGroups: (p.assetGroups || []).map((g) => {
              if (g.id !== groupId) return g;
              return { ...g, items: [...(g.items || []), ...newItems] };
            }) };
          }));
        }

        function getProjectGroupId(projectId) {
          const project = projects.find((p) => p.id === projectId);
          return (project?.assetGroups || [])[0]?.id || "";
        }

        function getProjectAssetItem(project, assetId) {
          if (!project || !assetId) return null;
          const group = (project.assetGroups || [])[0];
          return (group?.items || []).find((item) => item.assetId === assetId || item.id === assetId) || null;
        }

        function getProjectAssetUrl(project, assetId) {
          return getProjectAssetItem(project, assetId)?.url || "";
        }

        // Skills ticked in the active project, sent with video generations so the
        // prompt optimiser adds them to the Seedance 2.5 Optimizer.
        function projectSkillIdsForGeneration() {
          if (activeSection !== "projects" || !activeProjectId) return [];
          const proj = projects.find((p) => p.id === activeProjectId);
          return (proj?.skills || []).filter((id) => SKILL_CATALOG.some((sk) => sk.id === id && sk.projectType !== "universal"));
        }

        function promptSkillsSummary() {
          const ids = projectSkillIdsForGeneration();
          if (!ids.length) return "Optimised with the Seedance 2.5 Optimizer";
          const names = ids.map((id) => (SKILL_CATALOG.find((sk) => sk.id === id) || { label: id }).label);
          return `Optimised with the Seedance 2.5 Optimizer + ${names.length} project skill${names.length === 1 ? "" : "s"}: ${names.join(", ")}`;
        }

        function markProjectToolUsed(toolKey) {
          if (activeSection !== "projects" || !activeProjectId) return;
          setProjects((prev) => prev.map((project) => {
            if (project.id !== activeProjectId) return project;
            const usedTools = Array.from(new Set([...(project.usedTools || []), toolKey]));
            return {
              ...project,
              usedTools,
              collapsedTools: { ...(project.collapsedTools || {}), [toolKey]: false },
            };
          }));
        }

        function toggleProjectToolCollapsed(toolKey) {
          if (activeSection !== "projects" || !activeProjectId) return;
          setProjects((prev) => prev.map((project) => {
            if (project.id !== activeProjectId) return project;
            const collapsedTools = { ...(project.collapsedTools || {}) };
            collapsedTools[toolKey] = !collapsedTools[toolKey];
            return { ...project, collapsedTools };
          }));
        }

        function isProjectToolContext(toolKey) {
          return activeSection === "projects" && !!activeProjectId;
        }

        // Reference uploads (video-generation refs, long-duration shot refs,
        // character-sheet refs, i2i source, storyboard refs) are inputs to a
        // generation call, not asset-group management — they must never add
        // to the project's asset group on their own. The only place that may
        // add to a project's asset group is the group's own "Upload Assets"
        // button (uploadFilesToGroup) or an explicit "Add to asset group" on
        // a generated result (addGeneratedAssetToProjectGroup). Generation
        // submission works fine off dataUrl alone — /api/video/start uploads
        // any raw data: URL itself before calling the video API, so skipping
        // the group write here does not break Video Generation or Long
        // Duration reference images.
        async function loadReferenceImagesForProject(fileList, keyHintPrefix) {
          const files = Array.from(fileList || []);
          const items = [];
          for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            const dataUrl = await readCompatibleImageDataUrl(file);
            items.push({
              name: file.name,
              dataUrl,
              origin: "upload",
              assetId: "",
              assetUrl: "",
            });
          }
          return items;
        }

        async function addGeneratedAssetToProjectGroup({ toolKey, dataUrl, sourceUrl, name, keyHint, type = "image", resultKey = "" }) {
          if (!isProjectToolContext(toolKey) || !activeProjectId) {
            throw new Error("Open this tool inside a project to add assets to its group.");
          }
          const groupId = getProjectGroupId(activeProjectId);
          if (!groupId) {
            throw new Error("Create the project's asset group first.");
          }
          const res = await fetch("/api/assets/add_to_group", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              group_id: groupId,
              data_url: dataUrl || "",
              source_url: sourceUrl || "",
              key_hint: keyHint,
              asset_type: type === "video" ? "Video" : "Image",
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to add asset to group");
          setProjects((prev) => prev.map((project) => {
            if (project.id !== activeProjectId) return project;
            const nextResults = { ...defaultProjectResults(), ...(project.results || {}) };
            const assetId = data.asset_id || "";
            if (resultKey === "t2iImage") nextResults.t2iAssetId = assetId;
            if (resultKey === "i2iImage") nextResults.i2iAssetId = assetId;
            if (resultKey.startsWith("sheet:")) nextResults.images[resultKey.split(":")[1]] = assetId;
            if (resultKey === "storyboard") nextResults.wbStoryboardAssetId = assetId;
            if (resultKey === "videoMain") nextResults.videoAssetId = assetId;
            if (resultKey === "longCombined") nextResults.longCombinedAssetId = assetId;
            if (resultKey.startsWith("longShot:")) {
              const label = resultKey.split(":")[1];
              nextResults.longShots = nextResults.longShots.map((shot) => (
                shot.label === label ? { ...shot, videoAssetId: assetId } : shot
              ));
            }
            return {
              ...project,
              results: nextResults,
              assetGroups: (project.assetGroups || []).map((group) => {
                if (group.id !== groupId) return group;
                if ((group.items || []).some((item) => item.assetId === assetId || item.url === (data.asset_url || dataUrl || sourceUrl))) return group;
                return {
                  ...group,
                  items: [
                    ...(group.items || []),
                    {
                      id: data.asset_id || genId(),
                      assetId: data.asset_id || "",
                      type,
                      url: data.asset_url || dataUrl,
                      name,
                    },
                  ],
                };
              }),
            };
          }));
          return data;
        }

        async function saveGeneratedAssetToProjectFolder({ toolKey, dataUrl, sourceUrl, name }) {
          if (!isProjectToolContext(toolKey) || !activeProjectId) {
            throw new Error("Open this tool inside a project to save it locally.");
          }
          const projectId = activeProjectId;
          const res = await fetch("/api/projects/save_to_folder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: getProjectFolderSlug(projectId),
              data_url: dataUrl || "",
              source_url: sourceUrl || "",
              name: name || "asset",
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to save file locally");
          setProjectLocalFiles((prev) => ({
            ...prev,
            [projectId]: [
              { name: data.filename, url: data.file_url, size: data.size, mtime: Date.now() },
              ...(prev[projectId] || []),
            ],
          }));
          return data;
        }

        async function refreshProjectLocalFiles(projectId) {
          if (!projectId) return;
          setProjectLocalFilesLoading(true);
          setProjectLocalFilesError("");
          try {
            const res = await fetch("/api/projects/list_folder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ project_id: getProjectFolderSlug(projectId) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to list local folder");
            setProjectLocalFiles((prev) => ({ ...prev, [projectId]: data.files || [] }));
          } catch (e) {
            setProjectLocalFilesError(String(e?.message || e));
          } finally {
            setProjectLocalFilesLoading(false);
          }
        }

        async function deleteProjectLocalFile(projectId, filename) {
          if (!projectId || !filename) return;
          setProjectLocalFilesError("");
          try {
            const res = await fetch("/api/projects/delete_folder_file", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ project_id: getProjectFolderSlug(projectId), filename }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete file");
            setProjectLocalFiles((prev) => ({
              ...prev,
              [projectId]: (prev[projectId] || []).filter((f) => f.name !== filename),
            }));
          } catch (e) {
            setProjectLocalFilesError(String(e?.message || e));
          }
        }

        // Sidebar tools, in display order. `group` is the category heading.
        const sidebarSections = [
          { key: "projects", label: "Projects", group: "Workspace" },
          { key: "canvas", label: "Canvas", group: "Workspace" },
          { key: "skill-library", label: "Skill Library", group: "Workspace" },
          { key: "visual-understanding", label: "Visual Understanding", group: "Analysis" },
          { key: "script-to-prompt", label: "Script to Prompt", group: "Story & Planning" },
          { key: "storyboard", label: "Storyboard", group: "Story & Planning" },
          { key: "previz", label: "Previz", group: "Story & Planning" },
          { key: "character-generation", label: "Character Generation", group: "Characters & Locations" },
          { key: "character-sheets", label: "Character Sheets", group: "Characters & Locations" },
          { key: "character-masking", label: "Character Masking", group: "Characters & Locations" },
          { key: "location-variations", label: "Location Variations", group: "Characters & Locations" },
          { key: "seedream-image", label: "Seedream Image", group: "Image" },
          { key: "seedream-layers", label: "Layer Separation", group: "Image" },
          { key: "seedream-edit", label: "Interactive Edit", group: "Image" },
          { key: "video-generation", label: "Video Generation", group: "Video" },
          { key: "long-duration", label: "Long Duration", group: "Video" },
          { key: "video-editor", label: "Video Editor", group: "Post-production" },
          { key: "video-enhancer", label: "Video Enhancer", group: "Post-production" },
          { key: "hybrid-studio", label: "Hybrid Studio", group: "Post-production" },
          { key: "combine-videos", label: "Combine Videos", group: "Post-production" },
          { key: "audio-black-video", label: "Audio to Black Video", group: "Post-production" },
          { key: "seed-audio", label: "Seed Audio", group: "Audio" },
          { key: "audiobook", label: "Audiobook Creator", group: "Audio" },
          { key: "blender-3d", label: "Blender 3D", group: "3D & Motion" },
          { key: "motion-blockout", label: "Motion Blockout", group: "3D & Motion" },
          { key: "skeleton-reference", label: "Skeleton Reference", group: "3D & Motion" },
        ];
        const sidebarGroups = sidebarSections.reduce((acc, section) => {
          const last = acc[acc.length - 1];
          if (last && last.name === section.group) last.items.push(section);
          else acc.push({ name: section.group, items: [section] });
          return acc;
        }, []);
        const activeProject = activeSection === "projects" && activeProjectId ? projects.find((p) => p.id === activeProjectId) : null;
        window.__ccProjectName = activeProject?.name || "";
        const activeProjectUsedTools = activeProject?.usedTools || [];
        const isTextOverlayProject = activeProject?.type === "text-overlay";
        const isSeedAudioProject = activeProject?.type === "seed-audio";
        const isAudiobookProject = activeProject?.type === "audiobook";
        const isSeedreamProject = activeProject?.type === "seedream";
        const isHybridStudioProject = activeProject?.type === "hybrid-studio";
        const activeProjectTools = isSeedAudioProject ? SEED_AUDIO_TOOLS : isAudiobookProject ? AUDIOBOOK_TOOLS : isSeedreamProject ? SEEDREAM_TOOLS : isHybridStudioProject ? HYBRID_STUDIO_TOOLS : PROJECT_TOOLS;
        // Canvas shortcut nodes open their tool in a side panel over the board.
        const canvasDrawer = activeSection === "canvas" ? canvasTool : "";
        const showCharacterGeneration = canvasDrawer === "character-generation" || activeSection === "character-generation" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "character-generation" || activeProjectUsedTools.includes("character-generation")));
        const showCharacterSheets = canvasDrawer === "character-sheets" || activeSection === "character-sheets" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "character-sheets" || activeProjectUsedTools.includes("character-sheets")));
        const showScriptToPrompt = canvasDrawer === "script-to-prompt" || activeSection === "script-to-prompt" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "script-to-prompt" || activeProjectUsedTools.includes("script-to-prompt")));
        const showStoryboard = canvasDrawer === "storyboard" || activeSection === "storyboard" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "storyboard" || activeProjectUsedTools.includes("storyboard")));
        const showVideoGeneration = canvasDrawer === "video-generation" || activeSection === "video-generation" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "video-generation" || activeProjectUsedTools.includes("video-generation")));
        const showLongDuration = canvasDrawer === "long-duration" || activeSection === "long-duration" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "long-duration" || activeProjectUsedTools.includes("long-duration")));
        const showCombineVideos = canvasDrawer === "combine-videos" || activeSection === "combine-videos";
        const showAudioBlackVideo = canvasDrawer === "audio-black-video" || activeSection === "audio-black-video";
        const showSeedream = (key) => canvasDrawer === key || activeSection === key || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === key || activeProjectUsedTools.includes(key)));
        const showSeedreamImage = showSeedream("seedream-image");
        const showAudiobook = showSeedream("audiobook");
        const showSeedreamLayers = showSeedream("seedream-layers");
        const showSeedreamEdit = showSeedream("seedream-edit");
        const showBlender3d = canvasDrawer === "blender-3d" || activeSection === "blender-3d" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "blender-3d" || activeProjectUsedTools.includes("blender-3d")));
        const showMotionBlockout = showSeedream("motion-blockout");
        const showVideoEnhancer = showSeedream("video-enhancer");
        const showCanvas = showSeedream("canvas");
        const showHybridStudio = showSeedream("hybrid-studio");
        const showVisualUnderstanding = showSeedream("visual-understanding");
        const showPreviz = showSeedream("previz");
        const showCharacterMasking = showSeedream("character-masking");
        const showLocationVariations = showSeedream("location-variations");
        const showVideoEditor = showSeedream("video-editor");
        const showSeedAudio = canvasDrawer === "seed-audio" || activeSection === "seed-audio" || (activeSection === "projects" && !!activeProjectId && (activeProjectTool === "seed-audio" || activeProjectUsedTools.includes("seed-audio")));
        const showSkeletonReference = canvasDrawer === "skeleton-reference" || activeSection === "skeleton-reference";
        const activeProjectGroupId = activeSection === "projects" && activeProjectId ? getProjectGroupId(activeProjectId) : "";
        const projectMode = activeSection === "projects" && !!activeProjectId;

        function getProjectToolHeaderStatus(toolKey) {
          if (toolKey === "character-generation") {
            const results = [];
            if (t2iImage) results.push("T2I");
            if (i2iImage) results.push("I2I");
            return results.length ? `${results.join(" + ")} ready` : ((t2iPrompt.trim() || i2iPrompt.trim()) ? "Prompt saved" : "Ready");
          }
          if (toolKey === "character-sheets") {
            const chars = activeProject?.results?.sheetBatch?.characters || [];
            const count = chars.filter((c) => c.image).length;
            return count ? `${count} sheet${count !== 1 ? "s" : ""}` : (chars.length > 1 ? `${chars.length} characters` : "Ready");
          }
          if (toolKey === "script-to-prompt") {
            return scriptPromptOutput.trim() ? "Text ready" : (scriptSourceText.trim() ? "Prompt saved" : "Ready");
          }
          if (toolKey === "storyboard") {
            return wbStoryboardImage ? "Image ready" : ((wbPromptText.trim() || wbScript.trim() || wbSubject.trim()) ? "Prompt saved" : "Ready");
          }
          if (toolKey === "video-generation") {
            // Counts every finished variation across the original panel and
            // any duplicates made with its "+".
            const countReady = (variants, fallbackUrl) => {
              const done = (variants || []).filter((v) => !!v.url).length;
              return done || (fallbackUrl ? 1 : 0);
            };
            const readyCount = countReady(videoVariants, videoUrl)
              + (videoClones || []).reduce((acc, clone) => acc + countReady(clone.variants, clone.url), 0);
            if (readyCount > 1) return `${readyCount} videos ready`;
            if (readyCount === 1) return "Video ready";
            const hasPrompt = videoPrompt.trim() || (videoClones || []).some((clone) => (clone.prompt || "").trim());
            return hasPrompt ? "Prompt saved" : "Ready";
          }
          if (toolKey === "long-duration") {
            const readyCount = (longShots || []).filter((shot) => !!shot.videoUrl).length;
            return readyCount ? `${readyCount} shot${readyCount !== 1 ? "s" : ""} ready` : ((longShots || []).some((shot) => (shot.prompt || "").trim()) ? "Prompt saved" : "Ready");
          }
          if (toolKey === "seed-audio") return seedAudioHeaderStatus(activeProject?.results?.seedAudio);
          if (toolKey === "blender-3d") return blenderHeaderStatus(activeProject?.results?.blender3d);
          if (toolKey === "motion-blockout") return "Grey-box reference";
          if (toolKey === "video-enhancer") return "AI MediaKit";
          if (toolKey === "canvas") return "Node board";
          if (toolKey === "hybrid-studio") return "Green-screen replacement";
          if (toolKey === "visual-understanding") return window.visualUnderstandingHeaderStatus ? window.visualUnderstandingHeaderStatus(activeProject?.results?.visualUnderstanding) : "Image & video Q&A";
          if (toolKey === "previz") return "Blocking · schematic · animatic";
          if (toolKey === "character-masking") return "Silhouette plates";
          if (toolKey === "location-variations") return "Coverage & states";
          if (toolKey === "video-editor") {
            const ve = activeProject?.results?.videoEditor;
            const n = (ve?.clips || []).length;
            return (ve?.exports || []).length ? "Exported" : n ? `${n} clip${n === 1 ? "" : "s"} on timeline` : "Ready";
          }
          if (toolKey === "audiobook") return window.audiobookHeaderStatus ? window.audiobookHeaderStatus(activeProject?.results?.audiobook) : "Ready";
          if (SEEDREAM_TOOL_STATE[toolKey]) return window.seedreamHeaderStatus ? window.seedreamHeaderStatus(activeProject?.results?.[SEEDREAM_TOOL_STATE[toolKey]], toolKey.replace("seedream-", "")) : "Ready";
          return "Ready";
        }

        function getProjectToolHeaderPreview(toolKey) {
          if (toolKey === "character-generation") return (charGenTab === "i2i" ? i2iPrompt : t2iPrompt).trim();
          if (toolKey === "character-sheets") return (activeProject?.results?.sheetBatch?.characters || []).map((c) => c.name).join(", ");
          if (toolKey === "script-to-prompt") return scriptSourceText.trim();
          if (toolKey === "storyboard") return wbPromptText.trim() || wbScript.trim() || wbSubject.trim() || wbAction.trim();
          if (toolKey === "video-generation") return videoGeneratedPrompt.trim() || videoPrompt.trim();
          if (toolKey === "long-duration") return (longShots || []).map((shot) => shot.prompt || "").find((value) => value.trim()) || "";
          if (toolKey === "seed-audio") return (activeProject?.results?.seedAudio?.prompt || "").trim();
          if (toolKey === "blender-3d") return (activeProject?.results?.blender3d?.description || "").trim();
          if (toolKey === "seedream-image") return (activeProject?.results?.seedreamImage?.prompt || "").trim();
          if (toolKey === "audiobook") return [activeProject?.results?.audiobook?.cast?.title || activeProject?.results?.audiobook?.fileName || ""].join("").trim();
          if (toolKey === "seedream-edit") return (activeProject?.results?.seedreamEdit?.prompt || "").trim();
          return "";
        }

        // One Video Generation panel — the original, or one of the duplicates
        // its "+" button creates. Every value it reads and writes goes through
        // `inst`, so a duplicate is a genuinely independent generation (its own
        // prompt, references, model, output settings and job) rather than a
        // second view of the same one.
        function renderTextOverlaySection(...args) {
          return renderTextOverlaySectionView({
            isCoveredTextOverlay, onBuildTextOverlays, onEditTextOverlay, onRegenerateTextOverlay,
            onRemoveTextOverlay, onRenderCoveredTextOverlay, setModalImageUrl, textOverlayHasContent,
            textOverlayReferenceSignature
          }, ...args);
        }

        function renderVideoPanel(...args) {
          return renderVideoPanelView({
            activeProjectGroupId, activeProjectId, activeSection, addGeneratedAssetToProjectGroup,
            applyVideoCloneUpdate, applyVideoJobUpdate, applyVideoVariantUpdate, downloadImage,
            duplicateVideoPanel, finalizeDraftVariant, formatDuration, formatElapsed,
            getMediaDurationSeconds, getVideoReferencePreviewLabel, i2iImage, isProjectToolContext,
            isTextOverlayProjectId, loadReferenceImagesForProject, loading, onClearVideoPanel,
            onGenerateVideoFor, openProjectAssetReferencePicker, projectMode, promptSkillsSummary,
            readFileAsDataUrl, removeVideoPanel, renderTextOverlaySection,
            saveGeneratedAssetToProjectFolder, saveRefUploadLocally, selectVideoVariant,
            setProjectAssetGroupError, setProjectLocalFilesError, setUseVideoRefVideosForShotA,
            shotASeedLoading, t2iImage, useI2IForVideoAll, useT2IForVideoAll,
            useVideoRefVideosForShotA, variantGenSeconds, videoDisabledHint, videoLoading,
            videoPanelTextOverlayTarget, videoUrl
          }, ...args);
        }

        // Model pickers at the top of a tool card. The choice is app-wide (saved
        // server-side, services/model_settings.py), so every tool follows it.
        // uses: [["image", "what it does here"], ["prompt", "…"]].
        const [modelSaving, setModelSaving] = useState(false);
        function chooseModel(role, id) {
          setModelSaving(true);
          fetch("/api/system/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [role]: id }) })
            .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`); setModelInfo(d); }))
            .catch((e) => alert(`Could not change the model: ${e.message}`))
            .finally(() => setModelSaving(false));
        }
        function renderModelLine(uses) {
          if (!modelInfo || !modelInfo.options) return null;
          const roleName = { prompt: "LLM", image: "Image model" };
          return (
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {uses.filter(([role]) => modelInfo[role]).map(([role, use]) => (
                  <label key={role} style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 220px", minWidth: 0 }}>
                    <span className="field-label" style={{ margin: 0 }}>{roleName[role]} <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>— {use}</span></span>
                    <select className="select-input" style={{ height: 34, padding: "0 10px", fontSize: 12 }} value={modelInfo[role].id} disabled={modelSaving}
                      onChange={(e) => chooseModel(role, e.target.value)}>
                      {(modelInfo.options[role] || []).map((o) => <option key={o.id} value={o.id}>{o.label} · {o.id}{o.note ? ` (${o.note})` : ""}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="video-hint" style={{ marginTop: 4 }}>Model choice applies to every tool in the app.</div>
            </div>
          );
        }

        function renderProjectToolCard(toolKey, label, content) {
          if (canvasDrawer && canvasDrawer === toolKey) {
            return (
              <div className="canvas-drawer" role="dialog" aria-label={label}>
                <div className="canvas-drawer-head">
                  <div className="tool-heading" style={{ margin: 0 }}>{label}</div>
                  <span style={{ flex: 1 }}></span>
                  <button type="button" className="btn-action btn-inline" onClick={() => setActiveSection(toolKey)}>Open full page</button>
                  <button type="button" className="btn-action btn-inline" onClick={() => setCanvasTool("")}>Back to canvas</button>
                </div>
                <div className="canvas-drawer-body">{content}</div>
              </div>
            );
          }
          if (!projectMode) return content;
          // A project shows only its type's tools, always in the type's list order.
          const toolIndex = activeProjectTools.findIndex((t) => t.key === toolKey);
          if (toolIndex < 0) return null;
          const collapsed = !!(activeProject?.collapsedTools || {})[toolKey];
          const preview = getProjectToolHeaderPreview(toolKey);
          return (
            <div className="proj-result-card" style={{ order: 100 + toolIndex }}>
              <button className="proj-result-header" onClick={() => toggleProjectToolCollapsed(toolKey)}>
                <div className="proj-result-header-main">
                  <div className="proj-result-title-row">
                    <div className="proj-result-title">{label}</div>
                    <div className="proj-result-status">{getProjectToolHeaderStatus(toolKey)}</div>
                  </div>
                  {preview ? <div className="proj-result-preview">{preview}</div> : null}
                </div>
                <svg className={"proj-result-chevron" + (collapsed ? " collapsed" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {!collapsed ? <div className="proj-result-body">{content}</div> : null}
            </div>
          );
        }

        // #region debug-point A:project-tool-visibility
        useEffect(() => {
          postDebugEvent({
            sessionId: "project-tool-panels",
            runId: "pre-fix",
            hypothesisId: "A",
            location: "app.py:project-tool-visibility",
            msg: "[DEBUG] Project tool visibility snapshot",
            data: {
              activeSection,
              activeProjectId,
              activeProjectTool,
              hasT2iImage: !!t2iImage,
              hasI2iImage: !!i2iImage,
              showCharacterGeneration,
              showStoryboard,
            },
            ts: Date.now(),
          });
        }, [activeSection, activeProjectId, activeProjectTool, t2iImage, i2iImage, showCharacterGeneration, showStoryboard]);
        // #endregion

        return (
          <div className="app">
            {projectsSaveError ? <div className="error-box" style={{ marginTop: 0, marginBottom: 14 }}>{projectsSaveError}</div> : null}
            <div className="app-shell">
              <aside className="sidebar" aria-label="Tools">
                <div className="sidebar-brand">
                  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><defs><linearGradient id="ccMarkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4F46E5"></stop><stop offset="0.55" stopColor="#7C6FE3"></stop><stop offset="1" stopColor="#EC4899"></stop></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#ccMarkG)"></rect><rect x="6.5" y="9.5" width="17" height="14" rx="3" fill="none" stroke="#fff" strokeWidth="2"></rect><path d="M13 13.4v6.2l5-3.1z" fill="#fff"></path><path d="M25 4.5l1.1 2.4 2.4 1.1-2.4 1.1L25 11.5l-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#fff"></path></svg>
                  Content Creator
                </div>
                {sidebarGroups.map((group) => (
                  <nav key={group.name} aria-label={group.name}>
                    <div className="sidebar-group">{group.name}</div>
                    <div className="sidebar-nav">
                      {group.items.map((section) => (
                        <button
                          key={section.key}
                          className={"sidebar-btn" + (activeSection === section.key ? " active" : "")}
                          aria-current={activeSection === section.key ? "page" : undefined}
                          onClick={() => setActiveSection(section.key)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SIDEBAR_ICONS[section.key] || SIDEBAR_ICONS.default}</svg>
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </nav>
                ))}
              </aside>
              <div className={"content-column" + (projectMode ? " proj-ordered" : "")}>
            {activeSection === "projects" ? (
              <>
            {!activeProjectId ? (
              <>
                <div className="proj-list-head">
                  <div className="tool-heading">Projects</div>
                  <button className="proj-new-btn" onClick={() => setShowNewProjectModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                    New Project
                  </button>
                </div>
                {(() => {
                  const toolLabels = {};
                  [...PROJECT_TOOLS, ...SEED_AUDIO_TOOLS, ...AUDIOBOOK_TOOLS, ...SEEDREAM_TOOLS, ...HYBRID_STUDIO_TOOLS].forEach((t) => { toolLabels[t.key] = t.label; });
                  const typeLabel = (key) => (PROJECT_TYPES.find((t) => t.key === key) || { label: key || "" }).label;
                  const assetCount = (p) => (p.assetGroups || []).reduce((a, g) => a + (g.items || []).length, 0);
                  const terms = projectFilter.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
                  const typeCounts = {};
                  projects.forEach((p) => { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
                  // Every word must match the name, the type, or a tool the project uses.
                  const matches = (p) => {
                    if (projectFilter.type !== "all" && p.type !== projectFilter.type) return false;
                    if (!terms.length) return true;
                    const hay = [p.name, typeLabel(p.type), ...(p.usedTools || []).map((k) => toolLabels[k] || k)].join(" ").toLowerCase();
                    return terms.every((t) => hay.includes(t));
                  };
                  const sorters = {
                    newest: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
                    oldest: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
                    "name-asc": (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" }),
                    "name-desc": (a, b) => (b.name || "").localeCompare(a.name || "", undefined, { numeric: true, sensitivity: "base" }),
                    assets: (a, b) => assetCount(b) - assetCount(a),
                  };
                  const visible = projects.filter(matches).sort(sorters[projectFilter.sort] || sorters.newest);
                  const filtered = terms.length || projectFilter.type !== "all";
                  const setF = (patch) => setProjectFilter((prev) => ({ ...prev, ...patch }));
                  return (
                    <>
                      <div className="card proj-filter-bar">
                        <div className="proj-filter-row">
                          <div className="proj-search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                              className="video-input sa-input"
                              placeholder="Search projects by name, type or tool…"
                              value={projectFilter.query}
                              onChange={(e) => setF({ query: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Escape") setF({ query: "" }); }}
                            />
                            {projectFilter.query ? <button className="proj-search-clear" title="Clear search" onClick={() => setF({ query: "" })}>×</button> : null}
                          </div>
                          <select className="select-input proj-sort" value={projectFilter.sort} onChange={(e) => setF({ sort: e.target.value })} aria-label="Sort projects">
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                            <option value="name-asc">Name A–Z</option>
                            <option value="name-desc">Name Z–A</option>
                            <option value="assets">Most assets</option>
                          </select>
                        </div>
                        <div className="tabs" style={{ margin: "10px 0 0" }}>
                          <button className={"tab-btn" + (projectFilter.type === "all" ? " active" : "")} onClick={() => setF({ type: "all" })}>All · {projects.length}</button>
                          {PROJECT_TYPES.filter((t) => typeCounts[t.key]).map((t) => (
                            <button key={t.key} className={"tab-btn" + (projectFilter.type === t.key ? " active" : "")} onClick={() => setF({ type: projectFilter.type === t.key ? "all" : t.key })}>
                              {t.label} · {typeCounts[t.key]}
                            </button>
                          ))}
                        </div>
                        {filtered ? (
                          <div className="video-hint">
                            Showing {visible.length} of {projects.length} project{projects.length === 1 ? "" : "s"}.{" "}
                            <button className="btn-link" onClick={() => setF({ query: "", type: "all" })}>Clear filters</button>
                          </div>
                        ) : null}
                      </div>
                      {filtered && !visible.length ? (
                        <div className="card" style={{ textAlign: "center" }}>
                          <div className="video-hint" style={{ marginTop: 0 }}>No projects match{projectFilter.query ? ` “${projectFilter.query}”` : ""}{projectFilter.type !== "all" ? ` in ${typeLabel(projectFilter.type)}` : ""}.</div>
                        </div>
                      ) : null}
                <div className="proj-grid">
                  {visible.map((proj) => {
                    const typeInfo = PROJECT_TYPES.find((t) => t.key === proj.type) || { label: proj.type };
                    return (
                      <div key={proj.id} className="proj-card" onClick={() => setActiveProjectId(proj.id)}>
                        <div className="proj-card-top">
                          <div>
                            {renderProjectName(proj, "proj-card-name", false)}
                            <span className="proj-type-badge">{typeInfo.label}</span>
                          </div>
                          <div className="proj-card-actions">
                          {renameButton(proj)}
                          <button className="proj-delete-btn" title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6l-1 14H6L5 6"></path>
                              <path d="M10 11v6"></path><path d="M14 11v6"></path>
                              <path d="M9 6V4h6v2"></path>
                            </svg>
                          </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="proj-new-card" role="button" tabIndex="0" onClick={() => setShowNewProjectModal(true)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowNewProjectModal(true); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M12 5v14"></path><path d="M5 12h14"></path>
                    </svg>
                    New Project
                  </div>
                </div>
                    </>
                  );
                })()}
              </>
            ) : (() => {
              const proj = projects.find((p) => p.id === activeProjectId);
              if (!proj) { setActiveProjectId(null); return null; }
              const typeInfo = PROJECT_TYPES.find((t) => t.key === proj.type) || { label: proj.type };
              return (
                <>
                  <button className="proj-detail-back" onClick={() => { setActiveProjectId(null); setAddingGroupForProjectId(null); setActiveProjectTool(""); setProjectAssetGroupError(""); setEditingProjectSkills(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                      <path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path>
                    </svg>
                    All Projects
                  </button>

                  <div className="proj-detail-title">
                    {renderProjectName(proj, "proj-detail-name", true)}
                    <span className="proj-type-badge">{typeInfo.label}</span>
                  </div>

                  <div className="section-heading" style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Skills</span>
                    <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: 11, height: "auto" }} onClick={() => setEditingProjectSkills((v) => !v)}>
                      {editingProjectSkills ? "Done" : "Edit"}
                    </button>
                  </div>
                  {(() => {
                    // The Seedance 2.5 Optimizer ("universal") is always applied; the
                    // rest are opt-in and are added to it when this project's Video
                    // Generation and Long Duration write prompts.
                    const optional = skillsForProjectType(proj.type).filter((sk) => sk.projectType !== "universal");
                    const selected = optional.filter((sk) => (proj.skills || []).includes(sk.id));
                    // Audio-only projects have no video prompts, so the Seedance optimizer doesn't apply.
                    const audioOnly = proj.type === "audiobook" || proj.type === "seed-audio" || proj.type === "seedream";
                    const alwaysOn = audioOnly ? null : SKILL_CATALOG.find((sk) => sk.projectType === "universal");
                    const row = (skill, control, extra) => (
                      <div className={"skill-checklist-row" + (control ? "" : " skill-summary-row")} key={skill.id}>
                        {control}
                        <div>
                          <div className="skill-checklist-label">
                            {skill.label}
                            <span className="skill-lib-tag">{skill.library}</span>
                            {extra}
                          </div>
                          <div className="skill-checklist-hint">{skill.hint}</div>
                        </div>
                      </div>
                    );
                    return (
                      <>
                        <div className="video-hint" style={{ marginTop: 0, marginBottom: 8 }}>
                          {audioOnly
                            ? "The Audiobook Creator and Seed Audio tools already write their prompts by the Seed Audio prompt guide; skills listed here are for reference and for Claude Code."
                            : "Ticked skills are added to the Seedance 2.5 Optimizer when this project's Video Generation and Long Duration write prompts. With none ticked, only the Seedance 2.5 Optimizer is used."}
                        </div>
                        <div className="skill-checklist">
                          {alwaysOn ? row(alwaysOn, null, <span className="skill-badge skill-badge-on">Always on</span>) : null}
                          {editingProjectSkills ? (
                            <>
                              {optional.length ? (
                                <div className="skill-bulk">
                                  <button className="btn-link" onClick={() => setProjects((prev) => prev.map((p) => p.id === proj.id ? { ...p, skills: optional.map((sk) => sk.id) } : p))}>Select all</button>
                                  <button className="btn-link" onClick={() => setProjects((prev) => prev.map((p) => p.id === proj.id ? { ...p, skills: [] } : p))}>Clear</button>
                                  <span>{selected.length} of {optional.length} selected</span>
                                </div>
                              ) : <div className="video-hint">No other skills are mapped to this project type yet.</div>}
                              {optional.map((skill) => (
                                <label className="skill-checklist-row" key={skill.id}>
                                  <input type="checkbox" checked={(proj.skills || []).includes(skill.id)} onChange={() => toggleProjectSkill(proj.id, skill.id)} />
                                  <div>
                                    <div className="skill-checklist-label">
                                      {skill.label}
                                      <span className="skill-lib-tag">{skill.library}</span>
                                    </div>
                                    <div className="skill-checklist-hint">{skill.hint}</div>
                                  </div>
                                </label>
                              ))}
                            </>
                          ) : selected.length ? (
                            selected.map((skill) => row(skill, null, null))
                          ) : (
                            <div className="video-hint" style={{ margin: "4px 0" }}>{audioOnly ? "No skills selected." : "No project skills selected — prompts use the Seedance 2.5 Optimizer only. Click Edit to add film-making skills."}</div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  <div className="section-heading" style={{ marginTop: 18 }}>Tools</div>
                  {isSeedAudioProject ? (
                    <div className="video-hint" style={{ marginBottom: 8 }}>
                      Seed Audio project — generate speech, clone voices from reference clips, dub or translate videos, and split tracks into stems with Seed Audio 1.5. The audio library and every generation stay with this project; videos made in Video Generation here can be picked as dubbing sources.
                    </div>
                  ) : null}
                  {isTextOverlayProject ? (
                    <div className="video-hint" style={{ marginBottom: 8 }}>
                      Text Overlay project — Video Generation and Long Duration first render every on-screen text (overlays and digital screens) as matching Seedream 5.0 Pro images, then pass them to Seedance as references so the spelling in the video is exact.
                    </div>
                  ) : null}
                  <div className="proj-tools-grid">
                    {activeProjectTools.map((tool) => (
                      <button key={tool.key} className={"proj-tool-btn" + (activeProjectTool === tool.key ? " active" : "")} onClick={() => { setActiveProjectTool(tool.key); markProjectToolUsed(tool.key); }}>
                        {tool.key === "character-generation" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>
                        )}
                        {tool.key === "character-sheets" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>
                        )}
                        {tool.key === "script-to-prompt" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        )}
                        {tool.key === "storyboard" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path></svg>
                        )}
                        {tool.key === "video-generation" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
                        )}
                        {tool.key === "long-duration" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M7 2v20"></path><path d="M17 2v20"></path><path d="M2 12h20"></path><path d="M2 7h5"></path><path d="M2 17h5"></path><path d="M17 17h5"></path><path d="M17 7h5"></path></svg>
                        )}
                        {tool.key === "screenplay-writer" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        )}
                        {tool.key === "video-review" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                        {tool.key === "audiobook" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        )}
                        {tool.key === "seedream-image" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        )}
                        {tool.key === "seedream-layers" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        )}
                        {tool.key === "seedream-edit" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                        )}
                        {tool.key === "motion-blockout" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="11" width="8" height="8" rx="1"></rect><path d="M14 7h7v7"></path><path d="m21 7-8 8"></path><circle cx="7" cy="6" r="2"></circle></svg>
                        )}
                        {tool.key === "video-editor" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M20 4 8.12 15.88"></path><path d="M14.47 14.48 20 20"></path><path d="M8.12 8.12 12 12"></path></svg>
                        )}
                        {(tool.key === "previz" || tool.key === "character-masking" || tool.key === "location-variations") && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">{tool.key === "previz" ? <><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8" cy="15" r="1.6"></circle><circle cx="15" cy="8" r="1.6"></circle><path d="M9.5 13.5 13.5 9.5"></path><path d="M16 17h3M17.5 15.5v3"></path></> : tool.key === "character-masking" ? <><circle cx="12" cy="7" r="3.5"></circle><path d="M5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21z" fill="currentColor" fillOpacity="0.25"></path></> : <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"></path><circle cx="12" cy="10" r="2.3"></circle></>}</svg>
                        )}
                        {tool.key === "hybrid-studio" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 15l5-5 4 4 3-3 6 6"></path><circle cx="12" cy="9" r="2.2" fill="currentColor" fillOpacity="0.35"></circle></></svg>
                        )}
                        {tool.key === "visual-understanding" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                        {tool.key === "canvas" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><><rect x="3" y="3" width="6" height="6" rx="1.5"></rect><rect x="15" y="15" width="6" height="6" rx="1.5"></rect><rect x="15" y="3" width="6" height="6" rx="1.5"></rect><path d="M9 6h6M18 9v6M9 6c3 0 3 12 6 12"></path></></svg>
                        )}
                        {tool.key === "video-enhancer" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path></svg>
                        )}
                        {tool.key === "blender-3d" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        )}
                        {tool.key === "seed-audio" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                        )}
                        {tool.key === "finish-postproduction" && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                        )}
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  {activeProjectTool ? (
                    <div className="video-hint" style={{ marginTop: 8 }}>
                      Used tools stay visible in this project workspace. Clicking another tool adds it here instead of replacing the previous one.
                    </div>
                  ) : (
                    <div className="video-hint" style={{ marginTop: 8 }}>
                      Select a tool above to use it inside this project.
                    </div>
                  )}
                  <div className="video-hint" style={{ marginTop: 8 }}>
                    Prompts stay attached to the project. Generated images and videos reappear here later only after `Add to asset group` is clicked and the asset is saved into this project's asset group.
                  </div>

                  <div className="section-heading" style={{ marginTop: 18 }}>Asset Group</div>
                  {projectAssetGroupError ? <div className="error-box">{projectAssetGroupError}</div> : null}

                  {(proj.assetGroups || []).length === 0 && addingGroupForProjectId !== proj.id ? (
                    <div className="card" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      No asset group yet. Create one to organise images and videos for this project, then upload files into it.
                    </div>
                  ) : null}

                  {(proj.assetGroups || []).map((group) => {
                    return (
                      <div key={group.id} className="ag-card">
                        <div className="ag-header">
                          <div>
                            <div className="ag-title">{group.name}</div>
                            <div className="ag-count">{(group.items || []).length} item{(group.items || []).length !== 1 ? "s" : ""}</div>
                            <div className="video-hint" style={{ marginTop: 2 }}>group_id: {group.backendGroupId || group.id}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              className="sr-only"
                              id={`project-group-upload-${group.id}`}
                              type="file"
                              accept={`${REFERENCE_IMAGE_ACCEPT},video/*`}
                              multiple
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                try {
                                  await uploadFilesToGroup(proj.id, group.id, files);
                                } catch (err) {
                                  setProjectAssetGroupError(String(err?.message || err));
                                }
                                e.target.value = "";
                              }}
                            />
                            <button className="btn-ghost" style={{ height: 28, fontSize: 11 }} onClick={() => document.getElementById(`project-group-upload-${group.id}`).click()}>
                              Upload Assets
                            </button>
                            <button className="ag-btn-delete" onClick={() => deleteAssetGroup(proj.id, group.id)}>Delete</button>
                          </div>
                        </div>
                        <div className="ag-body">
                          {(group.items || []).length > 0 ? (
                            <div className="ag-items-grid">
                              {(group.items || []).map((item) => (
                                <div key={item.id} className="ag-item">
                                  {item.type === "video" ? (
                                    <video
                                      className="ag-item-video-thumb"
                                      src={item.url}
                                      muted
                                      preload="metadata"
                                      onClick={() => setModalImageUrl(item.url)}
                                      style={{ cursor: "zoom-in" }}
                                    />
                                  ) : (
                                    <img
                                      className="ag-item-thumb"
                                      src={item.url}
                                      alt={item.name}
                                      onClick={() => setModalImageUrl(item.url)}
                                      style={{ cursor: "zoom-in" }}
                                    />
                                  )}
                                  <div className="ag-item-footer">
                                    <div className="ag-item-name" title={item.name}>{item.name}</div>
                                    <button className="ag-item-remove" title="Remove" onClick={() => removeAssetFromGroup(proj.id, group.id, item.id)}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>No assets yet.</div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {addingGroupForProjectId === proj.id ? (
                    <div className="ag-new-row">
                      <input
                        className="ag-name-input"
                        placeholder="Asset group name…"
                        value={newGroupName}
                        autoFocus
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createAssetGroup(proj.id); if (e.key === "Escape") { setAddingGroupForProjectId(null); setNewGroupName(""); setProjectAssetGroupError(""); } }}
                      />
                      <button className="btn-primary" style={{ flex: "0 0 auto", height: 32, fontSize: 12 }} onClick={() => createAssetGroup(proj.id)} disabled={creatingGroupForProjectId === proj.id}>{creatingGroupForProjectId === proj.id ? "Creating…" : "Create"}</button>
                      <button className="btn-ghost" style={{ flex: "0 0 auto", height: 32, fontSize: 12 }} onClick={() => { setAddingGroupForProjectId(null); setNewGroupName(""); setProjectAssetGroupError(""); }} disabled={creatingGroupForProjectId === proj.id}>Cancel</button>
                    </div>
                  ) : (proj.assetGroups || []).length === 0 ? (
                    <div
                      className="add-shot-row"
                      role="button"
                      tabIndex="0"
                      onClick={() => { setAddingGroupForProjectId(proj.id); setProjectAssetGroupError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setAddingGroupForProjectId(proj.id); setProjectAssetGroupError(""); } }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                      New Asset Group
                    </div>
                  ) : (
                    <div className="video-hint" style={{ marginTop: 10 }}>
                      This project already has its single allowed asset group.
                    </div>
                  )}

                  <div className="section-heading" style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Local Folder</span>
                    <button className="btn-ghost" style={{ height: 26, fontSize: 11 }} onClick={() => refreshProjectLocalFiles(proj.id)} disabled={projectLocalFilesLoading}>
                      {projectLocalFilesLoading ? "Refreshing…" : "Refresh"}
                    </button>
                  </div>
                  <div className="video-hint" style={{ marginTop: 2 }}>
                    Every project gets a local folder on disk at first creation. Nothing lands here automatically — click `Save locally` on a generation you want to keep, so only the ones you approve are stored.
                  </div>
                  {projectLocalFilesError ? <div className="error-box">{projectLocalFilesError}</div> : null}

                  {(projectLocalFiles[proj.id] || []).length === 0 ? (
                    <div className="card" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                      No files saved locally yet.
                    </div>
                  ) : (
                    <div className="ag-items-grid">
                      {(projectLocalFiles[proj.id] || []).map((file) => (
                        <div key={file.name} className="ag-item">
                          {/\.(mp4|mov|webm)$/i.test(file.name) ? (
                            <video
                              className="ag-item-video-thumb"
                              src={file.url}
                              muted
                              preload="metadata"
                              onClick={() => setModalImageUrl(file.url)}
                              style={{ cursor: "zoom-in" }}
                            />
                          ) : (
                            <img
                              className="ag-item-thumb"
                              src={file.url}
                              alt={file.name}
                              onClick={() => setModalImageUrl(file.url)}
                              style={{ cursor: "zoom-in" }}
                            />
                          )}
                          <div className="ag-item-footer">
                            <div className="ag-item-name" title={file.name}>{file.name}</div>
                            <a className="ag-item-remove" title="Download" href={file.url} download data-model={String(file.name || "file").replace(/[.][^.]+$/, "")} target="_blank" rel="noreferrer">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><path d="M12 3v12"></path><path d="M7 10l5 5 5-5"></path><path d="M5 21h14"></path></svg>
                            </a>
                            <button className="ag-item-remove" title="Remove" onClick={() => deleteProjectLocalFile(proj.id, file.name)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
              </>
            ) : null}

            {showScriptToPrompt ? renderProjectToolCard("script-to-prompt", "Script to Prompt", renderScriptToPromptTool({
              activeProject, activeProjectId, applyProjectJobUpdate, editScriptShot,
              fillLongShotPromptFromScript, nextShotLabel, onClearScriptToPrompt,
              onGenerateScriptToPrompt, onScriptPdfSelected, parsedScriptPromptShots, projectMode,
              renderModelLine, scriptPdfFile, scriptPdfInputRef, scriptPromptError,
              scriptPromptLoading, scriptPromptOutput, scriptShotBody, scriptSourceText,
              seedreamLocal, sendScriptCharactersToSheets, sendScriptLocationsToVariations,
              setScriptPdfFile, setScriptPromptOutput, setScriptSourceText
            })) : null}

            {showCharacterGeneration ? renderProjectToolCard("character-generation", "Character Generation", renderCharacterGenerationTool({
              activeProjectGroupId, addGeneratedAssetToProjectGroup, charEngineer, charGenTab,
              downloadImage, i2iAssetId, i2iError, i2iGroupId, i2iImage, i2iLoading, i2iMeta,
              i2iPrompt, i2iSourceImages, isProjectToolContext,
              linkGeneratedCharacterToWorldBuilding, onClearCharacterGeneration, onGenerateI2I,
              onGenerateT2I, onPickI2ISource, projectMode, removeWbLinkedRefs, renderModelLine,
              saveGeneratedAssetToProjectFolder, setCharEngineer, setCharGenTab, setI2iPrompt,
              setI2iSourceImages, setModalImageUrl, setProjectAssetGroupError,
              setProjectLocalFilesError, setT2iPrompt, setUseI2IForSheets, setUseI2IForVideoAll,
              setUseI2IForWb, setUseT2IForSheets, setUseT2IForVideoAll, setUseT2IForWb, t2iAssetId,
              t2iError, t2iGroupId, t2iImage, t2iLoading, t2iMeta, t2iPrompt, useI2IForSheets,
              useI2IForVideoAll, useI2IForWb, useT2IForSheets, useT2IForVideoAll, useT2IForWb
            })) : null}

            {showCharacterSheets ? renderProjectToolCard("character-sheets", "Character Sheets", renderCharacterSheetsTool({
              activeProject, activeProjectId, addGeneratedAssetToProjectGroup, error, i2iImage,
              i2iMeta, isProjectToolContext, projectMode, readFileAsDataUrl, renderModelLine,
              saveGeneratedAssetToProjectFolder, seedreamLocal, seedreamUpdater, setError,
              setModalImageUrl, setProjectAssetGroupError, setProjectLocalFilesError, t2iImage,
              t2iMeta, useSheetsIn
            })) : null}

            {showStoryboard ? renderProjectToolCard("storyboard", "Storyboard", renderStoryboardTool({
              activeProjectGroupId, addGeneratedAssetToProjectGroup, isProjectToolContext,
              onClearWorldBuilding, onWbAddRefImages, onWbAddRefVideos, onWbGeneratePrompts,
              projectMode, removeLongLinkedRefs, removeVideoLinkedRefs, renderModelLine,
              saveGeneratedAssetToProjectFolder, setModalImageUrl, setProjectAssetGroupError,
              setProjectLocalFilesError, setUseWbStoryboardForLong, setUseWbStoryboardForVideo,
              setWbAction, setWbCamera, setWbCameraTipsOpen, setWbCoreOpen, setWbEnvironment,
              setWbLighting, setWbQuality, setWbRefImages, setWbRefVideos, setWbScript, setWbStyle,
              setWbSubject, useWbStoryboardForLong, useWbStoryboardForVideo, wbAction, wbCamera,
              wbCameraTipsOpen, wbCoreOpen, wbEnvironment, wbError, wbGenerateLoading, wbLighting,
              wbPromptText, wbPromptsLoading, wbQuality, wbRefImages, wbRefVideos, wbScript,
              wbStoryboardImage, wbStyle, wbSubject
            })) : null}

            {showVideoGeneration ? renderProjectToolCard("video-generation", "Video Generation", (
              <>
            {!projectMode ? <div className="tool-heading">Video Generation</div> : null}
            {videoPanels.map((panel) => renderVideoPanel(panel))}
              </>
            )) : null}

            {showLongDuration ? renderProjectToolCard("long-duration", "Long Duration", renderLongDurationTool({
              activeProjectGroupId, activeProjectId, addGeneratedAssetToProjectGroup,
              addLongShotRefAudios, addLongShotRefImages, addLongShotRefVideos, applyLongShotUpdate,
              applyLongShotVariantUpdate, downloadImage, ffmpegAvailable, formatElapsed,
              isProjectToolContext, isTextOverlayProjectId, longAutoTextOverlays, longCombineError,
              longCombineLoading, longCombineTake, longCombineVideoCount, longCombinedUrl,
              longDuration, longExpanded, longFps, longModel, longModelSpec, longOutputFormat,
              longRatio, longReadyShotsCount, longResolution, longSeed, longSharedPool,
              longShotDuration, longShotImageNumbers, longShotPool, longShotTextOverlayTarget,
              longShots, onAddLongShot, onClearLongShot, onCombineLongShots, onGenerateLongShot,
              onUploadShotASeedVideo, openLongShotAssetReferencePicker, projectMode,
              promptSkillsSummary, renderTextOverlaySection, saveGeneratedAssetToProjectFolder,
              selectLongShotVariant, setLongAutoTextOverlays, setLongCombinePick, setLongDuration,
              setLongExpanded, setLongExtraRefImages, setLongFps, setLongLinkedSheetRefs,
              setLongModel, setLongOutputFormat, setLongRatio, setLongResolution, setLongSeed,
              setLongShots, setModalImageUrl, setProjectAssetGroupError, setProjectLocalFilesError,
              setShotASeedError, setShotASeedSource, setShotASeedSourceUrl, setShotASeedVideoAssetId,
              setShotASeedVideoAssetUrl, setShotASeedVideoDataUrl, setShotASeedVideoName,
              setUseVideoRefVideosForShotA, shotASeedError, shotASeedLoading, shotASeedSource,
              shotASeedVideoAssetId, shotASeedVideoName, suggestLongShotRoles, updateLongShot
            })) : null}

            {activeSection === "skill-library" ? (
              <>
                <div className="tool-heading">Skill Library</div>
                {window.SkillLibrary ? (
                  <window.SkillLibrary catalog={SKILL_CATALOG} projects={projects} projectTypes={PROJECT_TYPES} />
                ) : <div className="error-box">The Skill Library did not load (static/skill-library.jsx). Reload the page.</div>}
              </>
            ) : null}

            {showAudiobook ? renderProjectToolCard("audiobook", "Audiobook Creator", (
              <>
                {!projectMode ? localToolHeading("Audiobook Creator", "audiobook") : null}
                {window.AudiobookTool ? (
                  <window.AudiobookTool
                    key={projectMode ? `audiobook-${activeProjectId}` : localKey("audiobook", "audiobook")}
                    state={projectMode ? activeProject?.results?.audiobook : seedreamLocal.audiobook}
                    update={seedreamUpdater("audiobook")}
                  />
                ) : <div className="error-box">The Audiobook Creator did not load (static/audiobook.jsx). Reload the page.</div>}
              </>
            )) : null}

            {[
              { key: "seedream-layers", label: "Layer Separation", stateKey: "seedreamLayers", show: showSeedreamLayers, Comp: window.SeedreamLayerTool },
              { key: "seedream-edit", label: "Interactive Edit", stateKey: "seedreamEdit", show: showSeedreamEdit, Comp: window.SeedreamEditTool },
              { key: "seedream-image", label: "Seedream Image Generation", stateKey: "seedreamImage", show: showSeedreamImage, Comp: window.SeedreamImageTool },
            ].map((t) => (t.show ? (
              <React.Fragment key={t.key}>
                {renderProjectToolCard(t.key, t.label, (
                  <>
                    {!projectMode ? localToolHeading(t.label, t.stateKey) : null}
                    {t.Comp ? (
                      <t.Comp
                        key={projectMode ? `${t.key}-${activeProjectId}` : localKey(t.key, t.stateKey)}
                        state={projectMode ? activeProject?.results?.[t.stateKey] : seedreamLocal[t.stateKey]}
                        update={seedreamUpdater(t.stateKey)}
                      />
                    ) : <div className="error-box">The Seedream tools did not load (static/seedream-studio.jsx). Reload the page.</div>}
                  </>
                ))}
              </React.Fragment>
            ) : null))}

            {showBlender3d ? renderProjectToolCard("blender-3d", "Blender 3D", (
              <>
                {!projectMode ? localToolHeading("Blender 3D", "blender3d") : null}
                <BlenderStudio
                  key={projectMode ? `blender-${activeProjectId}` : localKey("blender", "blender3d")}
                  state={projectMode ? activeProject?.results?.blender3d : blenderLocal}
                  update={projectMode ? (fn) => updateProjectBlender(activeProjectId, fn) : guardedLocal("blender3d", setBlenderLocal)}
                />
              </>
            )) : null}

            {showMotionBlockout ? renderProjectToolCard("motion-blockout", "Motion Blockout", (
              <>
                {!projectMode ? localToolHeading("Motion Blockout", "motionBlockout") : null}
                {window.MotionBlockout ? <window.MotionBlockout key={projectMode ? "motion-blockout" : localKey("motion-blockout", "motionBlockout")} /> : <div className="error-box">Motion Blockout did not load (static/motion-blockout.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showVideoEditor ? renderProjectToolCard("video-editor", "Video Editor", (
              <>
                {!projectMode ? localToolHeading("Video Editor", "videoEditor") : null}
                {window.VideoEditor ? (
                  <window.VideoEditor
                    key={projectMode ? `video-editor-${activeProjectId}` : localKey("video-editor", "videoEditor")}
                    state={projectMode ? activeProject?.results?.videoEditor : seedreamLocal.videoEditor}
                    update={seedreamUpdater("videoEditor")}
                  />
                ) : <div className="error-box">The Video Editor did not load (static/video-editor.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showPreviz ? renderProjectToolCard("previz", "Previz", (
              <>
                {!projectMode ? localToolHeading("Previz", "previz") : null}
                {window.PrevizTool ? (
                  <window.PrevizTool
                    key={projectMode ? `previz-${activeProjectId}` : `previz-local-${localClearEpochs.previz || 0}`}
                    state={projectMode ? activeProject?.results?.previz : seedreamLocal.previz}
                    update={seedreamUpdater("previz")}
                  />
                ) : <div className="error-box">Previz did not load (static/film-tools.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showCharacterMasking ? renderProjectToolCard("character-masking", "Character Masking", (
              <>
                {!projectMode ? localToolHeading("Character Masking", "characterMasking") : null}
                {window.CharacterMasking ? (
                  <window.CharacterMasking
                    key={projectMode ? `character-masking-${activeProjectId}` : localKey("character-masking", "characterMasking")}
                    state={projectMode ? activeProject?.results?.characterMasking : seedreamLocal.characterMasking}
                    update={seedreamUpdater("characterMasking")}
                  />
                ) : <div className="error-box">Character Masking did not load (static/film-tools.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showLocationVariations ? renderProjectToolCard("location-variations", "Location Variations", (
              <>
                {!projectMode ? localToolHeading("Location Variations", "locationVariations") : null}
                {window.LocationVariations ? (
                  <window.LocationVariations
                    key={projectMode ? `location-variations-${activeProjectId}` : localKey("location-variations", "locationVariations")}
                    state={projectMode ? activeProject?.results?.locationVariations : seedreamLocal.locationVariations}
                    update={seedreamUpdater("locationVariations")}
                  />
                ) : <div className="error-box">Location Variations did not load (static/film-tools.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showHybridStudio ? renderProjectToolCard("hybrid-studio", "Hybrid Studio", (
              <>
                {!projectMode ? localToolHeading("Hybrid Studio", "hybridStudio") : null}
                {window.HybridStudio ? (
                  <window.HybridStudio
                    key={projectMode ? `hybrid-${activeProjectId}` : `hybrid-local-${localClearEpochs.hybridStudio || 0}`}
                    state={projectMode ? activeProject?.results?.hybridStudio : seedreamLocal.hybridStudio}
                    update={seedreamUpdater("hybridStudio")}
                  />
                ) : <div className="error-box">Hybrid Studio did not load (static/hybrid-studio.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showVisualUnderstanding ? renderProjectToolCard("visual-understanding", "Visual Understanding", (
              <>
                {!projectMode ? localToolHeading("Visual Understanding", "visualUnderstanding") : null}
                {window.VisualUnderstanding ? (
                  <window.VisualUnderstanding
                    key={projectMode ? `visual-understanding-${activeProjectId}` : localKey("visual-understanding", "visualUnderstanding")}
                    state={projectMode ? activeProject?.results?.visualUnderstanding : seedreamLocal.visualUnderstanding}
                    update={seedreamUpdater("visualUnderstanding")}
                    videoModels={VIDEO_MODELS.map((m) => ({ id: m.id, label: `Seedance ${m.label}`, maxDuration: m.maxDuration }))}
                    onUsePrompt={sendVideoUnderstandingPrompt}
                  />
                ) : <div className="error-box">Visual Understanding did not load (static/visual-understanding.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showCanvas ? renderProjectToolCard("canvas", "Canvas", (
              <>
                {!projectMode ? localToolHeading("Canvas", "canvas") : null}
                {window.CanvasTool ? (
                  <window.CanvasTool
                    key={projectMode ? `canvas-${activeProjectId}` : localKey("canvas", "canvas")}
                    state={projectMode ? activeProject?.results?.canvas : seedreamLocal.canvas}
                    update={seedreamUpdater("canvas")}
                    onOpenTool={(k) => (projectMode ? openToolRef.current && openToolRef.current(k) : setCanvasTool(k))}
                  />
                ) : <div className="error-box">The Canvas did not load (static/canvas.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showVideoEnhancer ? renderProjectToolCard("video-enhancer", "Video Enhancer", (
              <>
                {!projectMode ? localToolHeading("Video Enhancer", "videoEnhancer") : null}
                {window.VideoEnhancer ? <window.VideoEnhancer key={projectMode ? "video-enhancer" : localKey("video-enhancer", "videoEnhancer")} /> : <div className="error-box">The Video Enhancer did not load (static/video-enhancer.jsx). Reload the page.</div>}
              </>
            )) : null}

            {showSeedAudio ? renderProjectToolCard("seed-audio", "Seed Audio", (
              <>
                {!projectMode ? localToolHeading("Seed Audio", seedAudioModel === "1.0" ? "seedAudio10" : "seedAudio") : null}
                {seedAudioModel === "1.0" ? (window.SeedAudio10 ? (
                  <window.SeedAudio10
                    key={projectMode ? `seed-audio-10-${activeProjectId}` : localKey("seed-audio-10", "seedAudio10")}
                    state={projectMode ? activeProject?.results?.seedAudio10 : seedreamLocal.seedAudio10}
                    update={seedreamUpdater("seedAudio10")}
                    modelPicker={seedAudioModelPicker}
                  />
                ) : <div className="error-box">Seed Audio 1.0 did not load (static/seed-audio-10.jsx). Reload the page.</div>) : (
                <SeedAudioStudio
                  key={projectMode ? `seed-audio-${activeProjectId}` : localKey("seed-audio", "seedAudio")}
                  state={projectMode ? activeProject?.results?.seedAudio : seedAudioLocal}
                  update={projectMode ? (fn) => updateProjectSeedAudio(activeProjectId, fn) : guardedLocal("seedAudio", setSeedAudioLocal)}
                  videoOptions={sessionAssets.filter((a) => a.type === "video")}
                  modelPicker={seedAudioModelPicker}
                  skills={projectMode ? (activeProject?.skills || []).filter((id) => SKILL_CATALOG.some((sk) => sk.id === id && sk.library === "Seed Audio")) : []}
                />
                )}
              </>
            )) : null}

            {showCombineVideos ? renderCombineVideosTool({
              combineError, combineLoading, combineResultUrl, combineUploads, downloadImage,
              ffmpegAvailable, onAddCombineVideos, onCombineUploadedVideos, removeCombineUpload,
              setCombineError, setCombineUploads
            }) : null}

            {showAudioBlackVideo ? renderAudioBlackVideoTool({
              audioBlackUploads, downloadImage, ffmpegAvailable, onAddAudioBlackFiles,
              onAddAudioBlackImage, onGenerateAudioBlackVideo, removeAudioBlackUpload,
              updateAudioBlackUpload
            }) : null}

            {showSkeletonReference ? renderProjectToolCard("skeleton-reference", "Skeleton Reference", renderSkeletonReferenceTool({
              downloadImage, onAddSkeletonVideos, onGenerateSkeletonVideo, removeSkeletonUpload,
              setSkeletonAllPeople, setSkeletonGenerateOverlay, setSkeletonGenerateSkeleton,
              setSkeletonKptThr, setSkeletonMode, skeletonAllPeople, skeletonAvailable,
              skeletonGenerateOverlay, skeletonGenerateSkeleton, skeletonKptThr, skeletonMode,
              skeletonUploads
            })) : null}
              </div>
            </div>

            {showNewProjectModal ? (
              <div className="new-proj-overlay" onClick={() => setShowNewProjectModal(false)}>
                <div className="new-proj-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="new-proj-title">New Project</div>
                  <div className="field-label">Project Name</div>
                  <input
                    className="new-proj-input"
                    placeholder="e.g. Summer Campaign"
                    value={newProjectName}
                    autoFocus
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createProject(); if (e.key === "Escape") setShowNewProjectModal(false); }}
                  />
                  <div className="field-label" style={{ marginBottom: 8 }}>Project Type</div>
                  <div className="proj-type-grid">
                    {PROJECT_TYPES.map((t) => (
                      <div
                        key={t.key}
                        className={"proj-type-chip" + (newProjectType === t.key ? " selected" : "")}
                        role="button"
                        tabIndex="0"
                        onClick={() => setNewProjectType(t.key)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setNewProjectType(t.key); }}
                      >{t.label}</div>
                    ))}
                  </div>
                  <div className="btn-row">
                    <button className="btn-primary" onClick={createProject} disabled={!newProjectName.trim()}>Create Project</button>
                    <button className="btn-ghost" onClick={() => setShowNewProjectModal(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : null}

            {assetPickerOpen ? (
              <div className="picker-backdrop" onClick={() => setAssetPickerOpen(false)}>
                <div className="picker-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="picker-header">
                    <div className="picker-title">{assetPickerTitle}</div>
                    <button className="modal-close" onClick={() => setAssetPickerOpen(false)}>Close</button>
                  </div>
                  <div className="picker-body">
                    {pickerAssets.length === 0 ? (
                      <div className="picker-empty">{assetPickerEmptyLines.map((line, idx) => <div key={idx}>{line}</div>)}</div>
                    ) : (
                      <div className="picker-grid">
                        {pickerAssets.map((asset) => {
                          const selected = !!assetPickerSelected[asset.key];
                          return (
                            <div
                              key={asset.key}
                              className={"picker-item" + (selected ? " selected" : "")}
                              role="checkbox"
                              aria-checked={selected}
                              tabIndex="0"
                              onClick={() => setAssetPickerSelected((prev) => ({ ...prev, [asset.key]: !prev[asset.key] }))}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setAssetPickerSelected((prev) => ({ ...prev, [asset.key]: !prev[asset.key] })); }}
                            >
                              {asset.type === "video" ? (
                                <div className="picker-item-video">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                </div>
                              ) : (
                                <img className="picker-item-thumb" src={asset.url} alt={asset.name} />
                              )}
                              <div className="picker-item-name" title={asset.name}>{asset.name}</div>
                              {selected ? (
                                <div className="picker-check">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="picker-footer">
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {Object.values(assetPickerSelected).filter(Boolean).length} selected
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-ghost" style={{ flex: "none" }} onClick={() => setAssetPickerOpen(false)}>Cancel</button>
                      <button
                        className="btn-primary"
                        style={{ flex: "none", minWidth: 120 }}
                        disabled={!Object.values(assetPickerSelected).some(Boolean)}
                        onClick={confirmAssetPicker}
                      >{assetPickerConfirmLabel}</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {modalImageUrl ? (
              <div className="modal-backdrop" onClick={() => setModalImageUrl("")}>
                <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                  {/\.(mp4|mov|webm)(\?.*)?$/i.test(modalImageUrl) ? (
                    <>
                      <div className="modal-header">
                        <div className="modal-title">Preview</div>
                        <button className="modal-close" onClick={() => setModalImageUrl("")}>Close</button>
                      </div>
                      <video className="modal-image" src={modalImageUrl} controls autoPlay />
                    </>
                  ) : (
                    <ImageViewer src={modalImageUrl} onClose={closeImageViewer} />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );
      }

      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
