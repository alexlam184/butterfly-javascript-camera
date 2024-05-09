(function () {
  if (
    !"mediaDevices" in navigator ||
    !"getUserMedia" in navigator.mediaDevices
  ) {
    alert("Camera API is not available in your browser");
    return;
  }

  //read cam from query
  const queryString = window.location.search;
  console.log("alex query=", queryString);
  const urlParams = new URLSearchParams(queryString);

  var model;
  var publishable_key = "your publishable key";
  var toLoad = {
    model: "your robofow model",
    version: 0,
  };

  key = urlParams.get("key");
  model = urlParams.get("model");
  version = urlParams.get("version");

  if (
    key &&
    model &&
    version &&
    key !== "" &&
    model !== "" &&
    version !== "" &&
    queryString !== ""
  ) {
    publishable_key = key;
    toLoad = {
      model: model,
      version: version,
    };
  } else {
    console.log("use default model");
  }
  console.log("Publishable key=", publishable_key);
  console.log("model=", model, " ,version=", version);
  console.log("End config");

  // get page elements
  const video = document.querySelector("#cameraVideo");
  const btnPlay = document.querySelector("#btnPlay");
  const btnPause = document.querySelector("#btnPause");
  const btnScreenshot = document.querySelector("#btnScreenshot");
  const btnChangeCamera = document.querySelector("#btnChangeCamera");
  const screenshotsContainer = document.querySelector("#screenshots");
  const canvas = document.querySelector("#canvas");
  const devicesSelect = document.querySelector("#devicesSelect");

  // video constraints
  const constraints = {
    video: {
      width: {
        min: 1280,
        ideal: 1920,
        max: 2560,
      },
      height: {
        min: 720,
        ideal: 1080,
        max: 1440,
      },
    },
  };

  // use front face camera
  let useFrontCamera = true;

  // current video stream
  let videoStream;

  // handle events
  // play
  btnPlay.addEventListener("click", function () {
    video.play();
    btnPlay.classList.add("is-hidden");
    btnPause.classList.remove("is-hidden");
  });

  // pause
  btnPause.addEventListener("click", function () {
    video.pause();
    btnPause.classList.add("is-hidden");
    btnPlay.classList.remove("is-hidden");
  });

  // take screenshot
  btnScreenshot.addEventListener("click", function () {
    const img = document.createElement("img");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    img.src = canvas.toDataURL("image/png");
    screenshotsContainer.prepend(img);
  });

  // switch camera
  btnChangeCamera.addEventListener("click", function () {
    useFrontCamera = !useFrontCamera;

    initializeCamera();
  });

  // stop video stream
  function stopVideoStream() {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => {
        track.stop();
      });
    }
  }

  // initialize
  async function initializeCamera() {
    console.log("Initializing camera");
    stopVideoStream();
    constraints.video.facingMode = useFrontCamera ? "user" : "environment";

    try {
      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = videoStream;
    } catch (err) {
      alert(
        "Could not access the camera,Please press 'Swtich camera' to select the other camera"
      );
    } finally {
      console.log("end of camera initialization");
    }
  }
  initializeCamera();
})();
