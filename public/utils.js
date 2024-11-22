// Radio
async function postData(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await response.json();
}

function initializePlayer(stationId, stationClass) {
  postData("https://online-radio.my/api-backend.php", {
    id: stationId,
    action: "station-for-widget",
  }).then((response) => {
    if (response.data.station) {
      const station = response.data.station;
      document.querySelector(`[data-name="stream-url-${stationId}"]`).src =
        station.stream;
      document.querySelector(`[data-name="stream-url-${stationId}"]`).type =
        station.streamType;
      document.querySelector(`[data-name="stream-img-${stationId}"]`).src =
        station.image;

      new MediaElementPlayer(
        document.querySelector(
          `.player__wrapper.${stationClass} .player_audio_element`
        ),
        {
          alwaysShowControls: true,
          features: ["playpause", "progress", "volume"],
          hideVolumeOnTouchDevices: false,
          audioVolume: "vertical",
        }
      );
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const stations = document.querySelectorAll(".WPLw-elem");
  stations.forEach((station) => {
    const stationId = station.getAttribute("data-id");
    const stationClass = station.getAttribute("data-class");
    initializePlayer(stationId, stationClass);
  });
});

// Clock
function showTime() {
  var date = new Date();
  var h = date.getHours(); // 0 - 23
  var m = date.getMinutes(); // 0 - 59
  var s = date.getSeconds(); // 0 - 59
  var session = "AM";

  if (h == 0) {
    h = 12;
  }

  if (h > 12) {
    h = h - 12;
    session = "PM";
  }

  h = h < 10 ? "0" + h : h;
  m = m < 10 ? "0" + m : m;
  s = s < 10 ? "0" + s : s;

  var time = h + ":" + m + ":" + s + " " + session;
  document.getElementById("MyClockDisplay").innerText = time;
  document.getElementById("MyClockDisplay").textContent = time;

  setTimeout(showTime, 1000);
}

showTime();

const test = 'hello'