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
  var publishable_key = "rf_RJz2Himf15Z3sn4QbZvSPZcEbBn1";
  var toLoad = {
    model: "butterfly-nmqnt",
    version: 2,
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
      alert("Could not access the camera");
    } finally {
      console.log("end of camera initialization");
    }
  }

  //load roboflow model
  const loadModelPromise = new Promise(function (resolve, reject) {
    console.log("Loading Roboflow model...");
    try {
      roboflow
        .auth({
          publishable_key: publishable_key,
        })
        .load(toLoad)
        .then(function (m) {
          model = m;
          console.log("model loaded model=", m);
          resolve();
        });
    } catch (e) {
      alert("Roboflow model load fail");
    }
  });

  Promise.all([initializeCamera(), loadModelPromise]).then(function () {
    $("#cameraFrame").removeClass("loading");
    resizeCanvas();
    detectFrame();
  });

  var canvasRoboflow, ctx;
  const font = "16px sans-serif";

  function videoDimensions(video) {
    // Ratio of the video's intrisic dimensions
    var videoRatio = video.videoWidth / video.videoHeight;

    // The width and height of the video element
    var width = video.offsetWidth,
      height = video.offsetHeight;

    // The ratio of the element's width to its height
    var elementRatio = width / height;

    // If the video element is short and wide
    if (elementRatio > videoRatio) {
      width = height * videoRatio;
    } else {
      // It must be tall and thin, or exactly equal to the original ratio
      height = width / videoRatio;
    }

    return {
      width: width,
      height: height,
    };
  }

  //auto resize canvas
  $(window).resize(function () {
    resizeCanvas();
  });

  //roboflow
  const resizeCanvas = function () {
    $("#roboflowCanvas").remove();

    canvasRoboflow = $("<canvas id='roboflowCanvas'></canvas>");

    ctx = canvasRoboflow[0].getContext("2d");

    var dimensions = videoDimensions(video);

    console.log(
      video.videoWidth,
      video.videoHeight,
      video.offsetWidth,
      video.offsetHeight,
      ",dimensions=",
      dimensions
    );

    canvasRoboflow[0].width = video.videoWidth;
    canvasRoboflow[0].height = video.videoHeight;

    canvasRoboflow.css({
      width: dimensions.width,
      height: dimensions.height,
      // left: ($(window).width() - dimensions.width) / 2,
      // top: ($(window).height() - dimensions.height) / 2,
    });

    $("#cameraFrame").append(canvasRoboflow);
  };

  const renderPredictions = function (predictions) {
    var dimensions = videoDimensions(video);

    var scale = 1;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach(function (prediction) {
      const x = prediction.bbox.x;
      const y = prediction.bbox.y;

      const width = prediction.bbox.width;
      const height = prediction.bbox.height;

      // Draw the bounding box.
      ctx.strokeStyle = prediction.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(
        (x - width / 2) / scale,
        (y - height / 2) / scale,
        width / scale,
        height / scale
      );

      // Draw the label background.
      ctx.fillStyle = prediction.color;
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(
        (x - width / 2) / scale,
        (y - height / 2) / scale,
        textWidth + 8,
        textHeight + 4
      );
    });

    predictions.forEach(function (prediction) {
      const x = prediction.bbox.x;
      const y = prediction.bbox.y;

      const width = prediction.bbox.width;
      const height = prediction.bbox.height;

      // Draw the text last to ensure it's on top.
      ctx.font = font;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#000000";
      console.log("Object detected:", prediction.class, "x=", x, ",y=", y);
      $("#objectDetect").text(prediction.class);
      ctx.fillText(
        prediction.class,
        (x - width / 2) / scale + 4,
        (y - height / 2) / scale + 1
      );
    });
  };

  var prevTime;
  var pastFrameTimes = [];
  const detectFrame = function () {
    if (!model) return requestAnimationFrame(detectFrame);

    model
      .detect(video)
      .then(function (predictions) {
        requestAnimationFrame(detectFrame);
        renderPredictions(predictions);

        if (prevTime) {
          pastFrameTimes.push(Date.now() - prevTime);
          if (pastFrameTimes.length > 30) pastFrameTimes.shift();

          var total = 0;
          _.each(pastFrameTimes, function (t) {
            total += t / 1000;
          });

          var fps = pastFrameTimes.length / total;
          $("#fps").text(Math.round(fps));
        }
        prevTime = Date.now();
      })
      .catch(function (e) {
        console.log("CAUGHT", e);
        requestAnimationFrame(detectFrame);
      });
  };
})();
