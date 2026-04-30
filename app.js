const locationEl = document.getElementById("location");
const movementEl = document.getElementById("movement");
const bluetoothEl = document.getElementById("bluetooth");
const riskScoreEl = document.getElementById("risk-score");
const aiInsightEl = document.getElementById("ai-insight");
const pinInput = document.getElementById("pin");
const pinStatusEl = document.getElementById("pin-status");

let currentSpeed = 0;
let hasOfflineLocationBuffer = false;
let bluetoothConnected = false;
let movementState = "unknown";

function evaluateRisk() {
  let score = 0;

  if (!navigator.onLine) {
    score += 20;
  }

  if (movementState === "sudden") {
    score += 35;
  } else if (movementState === "driving") {
    score += 15;
  }

  if (!bluetoothConnected) {
    score += 10;
  }

  if (currentSpeed > 20) {
    score += 20;
  }

  if (hasOfflineLocationBuffer) {
    score += 5;
  }

  score = Math.min(score, 100);
  riskScoreEl.textContent = `Risk Score: ${score}`;

  if (score >= 70) {
    aiInsightEl.textContent = "AI Insight: High risk. Recommend safety check-in and contact alert.";
  } else if (score >= 40) {
    aiInsightEl.textContent = "AI Insight: Medium risk. Continue monitoring movement and connectivity.";
  } else {
    aiInsightEl.textContent = "AI Insight: Low risk. Conditions currently stable.";
  }
}

document.getElementById("start-location").addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationEl.textContent = "Location: Geolocation not supported.";
    return;
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, speed } = pos.coords;
      currentSpeed = speed || 0;

      if (!navigator.onLine) {
        hasOfflineLocationBuffer = true;
      }

      locationEl.textContent = `Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} | Speed: ${currentSpeed.toFixed(1)} m/s | ${navigator.onLine ? "Online" : "Offline buffer active"}`;
      evaluateRisk();
    },
    (err) => {
      locationEl.textContent = `Location error: ${err.message}`;
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
});

document.getElementById("start-movement").addEventListener("click", async () => {
  if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
    const permission = await DeviceMotionEvent.requestPermission();
    if (permission !== "granted") {
      movementEl.textContent = "Movement: Permission denied.";
      return;
    }
  }

  window.addEventListener("devicemotion", (event) => {
    const x = event.accelerationIncludingGravity?.x || 0;
    const y = event.accelerationIncludingGravity?.y || 0;
    const z = event.accelerationIncludingGravity?.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude > 24) {
      movementState = "sudden";
    } else if (magnitude > 14) {
      movementState = "driving";
    } else if (magnitude > 10) {
      movementState = "walking";
    } else {
      movementState = "stationary";
    }

    movementEl.textContent = `Movement: ${movementState} (magnitude ${magnitude.toFixed(2)})`;
    evaluateRisk();
  });

  movementEl.textContent = "Movement monitor enabled.";
});

document.getElementById("scan-bluetooth").addEventListener("click", async () => {
  if (!navigator.bluetooth) {
    bluetoothEl.textContent = "Bluetooth: Web Bluetooth not supported in this browser.";
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    bluetoothConnected = true;
    bluetoothEl.textContent = `Bluetooth connected: ${device.name || "Unnamed device"}`;
    evaluateRisk();
  } catch (error) {
    bluetoothEl.textContent = `Bluetooth scan canceled/failed: ${error.message}`;
  }
});

document.getElementById("save-pin").addEventListener("click", () => {
  const pin = pinInput.value.trim();
  if (!/^\d{4,8}$/.test(pin)) {
    pinStatusEl.textContent = "PIN must be 4-8 digits.";
    return;
  }

  localStorage.setItem("sentinel_pin", pin);
  pinStatusEl.textContent = "PIN saved.";
});

window.addEventListener("beforeunload", (event) => {
  const savedPin = localStorage.getItem("sentinel_pin");
  if (!savedPin) return;

  const entered = prompt("Enter Sentinel PIN to close Sentinel session:");
  if (entered !== savedPin) {
    event.preventDefault();
    event.returnValue = "Sentinel PIN required.";
  }
});

window.addEventListener("online", evaluateRisk);
window.addEventListener("offline", evaluateRisk);
evaluateRisk();
