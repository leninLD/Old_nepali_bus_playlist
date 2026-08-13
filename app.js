// --------------------------------------------------------------
// No login, no premium account needed — uses the free YouTube
// IFrame Player API to stream a public/unlisted playlist.
// ---------------------------------------------------------------

const els = {
  badge: document.getElementById("badge"),
  spotifyLink: document.getElementById("spotify-link"),
  ytLink: document.getElementById("ytmusic-link"),
  cover: document.getElementById("cover"),
  disc: document.getElementById("disc-rotor"),
  title: document.getElementById("track-title"),
  artist: document.getElementById("track-artist"),
  progressBar: document.getElementById("progress-bar"),
  progressFill: document.getElementById("progress-fill"),
  timeCurrent: document.getElementById("time-current"),
  timeDuration: document.getElementById("time-duration"),
  playBtn: document.getElementById("play-btn"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  hornBtn: document.getElementById("horn-btn"),
  hornSound: document.getElementById("horn-sound"),
  routesToggle: document.getElementById("routes-toggle"),
  routesList: document.getElementById("routes-list"),
  status: document.getElementById("status-msg"),
};

els.badge.textContent = CONFIG.BADGE_TEXT;
if (els.spotifyLink) els.spotifyLink.href = CONFIG.SPOTIFY_PLAYLIST_URL || "#";
els.ytLink.href = CONFIG.YT_MUSIC_URL;

function getPlaylistIdFromUrl(url) {
  try {
    return new URL(url).searchParams.get("list");
  } catch (_) {
    return null;
  }
}

const PLAYLIST_ID = getPlaylistIdFromUrl(CONFIG.YT_MUSIC_URL);

let ytPlayer = null;
let progressTimer = null;
let hasStarted = false;
let pendingPlaylistId = null;
let activeRouteIndex = null;

function setStatus(msg) {
  els.status.textContent = msg || "";
}

function formatTime(sec) {
  const totalSec = Math.max(0, Math.floor(sec));
  const min = Math.floor(totalSec / 60);
  const s = String(totalSec % 60).padStart(2, "0");
  return `${min}:${s}`;
}

// Called automatically once https://www.youtube.com/iframe_api has loaded.
window.onYouTubeIframeAPIReady = () => {
  if (!PLAYLIST_ID) {
    els.title.textContent = "No playlist configured";
    setStatus("Set a real playlist link in config.js (YT_MUSIC_URL).");
    return;
  }

  ytPlayer = new YT.Player("yt-player", {
    height: "0",
    width: "0",
    playerVars: {
      listType: "playlist",
      list: PLAYLIST_ID,
      autoplay: 1,
      mute: 1,
      controls: 0,
      disablekb: 1,
      playsinline: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
};

function onPlayerReady() {
  els.title.textContent = "Ready";
  els.artist.textContent = "Press play to start the playlist";
  setStatus("");

  // The IFrame API force-mutes playback that isn't tied to a direct,
  // in-iframe user gesture. Since we hide the native controls, nothing
  // ever un-mutes it unless we do it ourselves.
  ytPlayer.unMute();
  ytPlayer.setVolume(100);

  if (pendingPlaylistId && ytPlayer) {
    ytPlayer.loadPlaylist({
      list: pendingPlaylistId,
      listType: "playlist",
      index: 0,
    });
    pendingPlaylistId = null;
  }
}

function onPlayerError(e) {
  const messages = {
    2: "Invalid playlist link — check YT_MUSIC_URL in config.js.",
    5: "This track can't be played in an embedded player.",
    100: "Playlist not found (it may have been deleted or set to private).",
    101: "This playlist's owner has disabled embedding.",
    150: "This playlist's owner has disabled embedding.",
  };
  setStatus(messages[e.data] || "Playback error.");
}

function onPlayerStateChange(e) {
  const state = e.data;

  if (state === YT.PlayerState.PLAYING) {
    hasStarted = true;
    els.playBtn.textContent = "⏸";
    setDiscSpinning(true);
    updateTrackInfo();
    clearInterval(progressTimer);
    progressTimer = setInterval(updateProgress, 250);
  } else {
    clearInterval(progressTimer);
    setDiscSpinning(false);
    if (state === YT.PlayerState.PAUSED) {
      els.playBtn.textContent = "▶";
    }
  }
}

function setDiscSpinning(shouldSpin) {
  if (!els.disc) return;
  els.disc.classList.toggle("spinning", shouldSpin);
}

function updateTrackInfo() {
  const data = ytPlayer.getVideoData();
  const rawTitle = data.title || "Unknown title";

  // Many music uploads are titled "Artist - Track" — split it when possible.
  const parts = rawTitle.split(" - ");
  if (parts.length >= 2) {
    els.artist.textContent = parts[0].trim();
    els.title.textContent = parts.slice(1).join(" - ").trim();
  } else {
    els.title.textContent = rawTitle;
    els.artist.textContent = "";
  }

  if (data.video_id) {
    els.cover.src = `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg`;
  }
}
// ---------------- Background slideshow ----------------
// ---------------- Background slideshow (crossfade) ----------------
const BG_IMAGES = ["assets/bg.png", "assets/bg2.png", "assets/bg3.png"];
let bgIndex = 0;
let activeLayer = "a";

function startBackgroundSlideshow() {
  const layerA = document.getElementById("bg-layer-a");
  const layerB = document.getElementById("bg-layer-b");
  if (!layerA || !layerB) return;

  setInterval(() => {
    bgIndex = (bgIndex + 1) % BG_IMAGES.length;
    const showing = activeLayer === "a" ? layerA : layerB;
    const hidden = activeLayer === "a" ? layerB : layerA;

    hidden.style.backgroundImage = `url("${BG_IMAGES[bgIndex]}")`;
    hidden.classList.add("active");
    showing.classList.remove("active");
    activeLayer = activeLayer === "a" ? "b" : "a";
  }, 15000);
}
startBackgroundSlideshow();

function startClock() {
  const el = document.getElementById("live-clock");
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };
  tick();
  setInterval(tick, 1000);
}
startClock();
// Autoplay starts muted (browsers always allow that). Unmute automatically
// on the visitor's very first interaction with the page, whatever it is.
function unlockAudioOnFirstInteraction() {
  const unlock = () => {
    if (ytPlayer && typeof ytPlayer.unMute === "function") {
      ytPlayer.unMute();
      ytPlayer.setVolume(80);
    }
    document.removeEventListener("click", unlock);
    document.removeEventListener("touchstart", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("click", unlock, { once: true });
  document.addEventListener("touchstart", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}
unlockAudioOnFirstInteraction();

function clearNowPlayingUI() {
  els.title.textContent = "Loading…";
  els.artist.textContent = "";
  els.cover.src = "assets/placeholder-cover.svg";
  els.timeCurrent.textContent = "0:00";
  els.timeDuration.textContent = "0:00";
  els.progressFill.style.width = "0%";
}

function updateProgress() {
  if (!ytPlayer) return;
  const duration = ytPlayer.getDuration() || 0;
  const current = ytPlayer.getCurrentTime() || 0;
  els.timeDuration.textContent = formatTime(duration);
  els.timeCurrent.textContent = formatTime(current);
  els.progressFill.style.width = duration ? `${(current / duration) * 100}%` : "0%";
}

// ---------------- Controls ----------------

els.playBtn.addEventListener("click", () => {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.unMute();
    ytPlayer.setVolume(100);
    ytPlayer.playVideo();
  }
});

els.nextBtn.addEventListener("click", () => {
  if (ytPlayer && hasStarted) ytPlayer.nextVideo();
});

els.prevBtn.addEventListener("click", () => {
  if (ytPlayer && hasStarted) ytPlayer.previousVideo();
});

if (els.hornBtn && els.hornSound) {
  els.hornBtn.addEventListener("click", () => {
    els.hornSound.currentTime = 0;
    els.hornSound.play().catch(() => {});
  });
}

function renderRoutes() {
  if (!CONFIG.ROUTES || !Array.isArray(CONFIG.ROUTES)) return;
  els.routesList.innerHTML = "";

  CONFIG.ROUTES.forEach((route, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-item";
    button.textContent = route.name;
    button.dataset.routeIndex = String(index);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectRoute(index);
      collapseRoutesPanel();
    });
    els.routesList.appendChild(button);
  });

  const initialIndex = CONFIG.ROUTES.findIndex((route) => {
    return getPlaylistIdFromUrl(route.ytMusicUrl) === PLAYLIST_ID;
  });

  if (initialIndex >= 0) {
    activeRouteIndex = initialIndex;
    updateRouteSelection();
  }
}

function selectRoute(index) {
  if (!CONFIG.ROUTES || !CONFIG.ROUTES[index]) return;

  activeRouteIndex = index;
  updateRouteSelection();

  const playlistId = getPlaylistIdFromUrl(CONFIG.ROUTES[index].ytMusicUrl);
  if (!playlistId) {
    setStatus("Invalid route playlist URL.");
    return;
  }

  els.ytLink.href = CONFIG.ROUTES[index].ytMusicUrl;
  clearNowPlayingUI();

  if (!ytPlayer) {
    pendingPlaylistId = playlistId;
    setStatus("Loading selected route...");
    return;
  }

  // Force a clean reset before switching — loading a new playlist while the
  // previous one is still mid-playback/mid-buffer can otherwise race with
  // the load and leave the old track resumed instead of the new one.
  ytPlayer.stopVideo();

  // loadPlaylist() already loads AND plays the first video by itself — no
  // separate playVideo() call needed (calling it immediately after used to
  // occasionally act on the still-old cued video instead of the new one).
  ytPlayer.loadPlaylist({
    list: playlistId,
    listType: "playlist",
    index: 0,
  });
}

function updateRouteSelection() {
  Array.from(els.routesList.children).forEach((child, idx) => {
    child.classList.toggle("active", idx === activeRouteIndex);
  });
  if (activeRouteIndex !== null && CONFIG.ROUTES[activeRouteIndex]) {
    els.ytLink.href = CONFIG.ROUTES[activeRouteIndex].ytMusicUrl;
  }
}

function toggleRoutesPanel() {
  const expanded = els.routesToggle.getAttribute("aria-expanded") === "true";
  els.routesToggle.setAttribute("aria-expanded", String(!expanded));
  els.routesList.setAttribute("aria-hidden", String(expanded));
}

function collapseRoutesPanel() {
  els.routesToggle.setAttribute("aria-expanded", "false");
  els.routesList.setAttribute("aria-hidden", "true");
}

if (els.routesToggle) {
  els.routesToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleRoutesPanel();
  });
}

window.addEventListener("click", (event) => {
  if (!els.routesToggle || !els.routesList) return;
  const target = event.target;
  if (!els.routesPanel?.contains(target) && els.routesToggle.getAttribute("aria-expanded") === "true") {
    collapseRoutesPanel();
  }
});

renderRoutes();


els.progressBar.addEventListener("click", (e) => {
  if (!ytPlayer || !hasStarted) return;
  const duration = ytPlayer.getDuration();
  if (!duration) return;
  const rect = els.progressBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  ytPlayer.seekTo(ratio * duration, true);
});

// Keep the route panel reference in JS for outside click handling.
els.routesPanel = document.getElementById("routes-panel");