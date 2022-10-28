(() => {
	function getUrlParam({ url, key }) {
		const params = new URLSearchParams(new URL(url).search);
		return params.get(key);
	}
	function cancelCurrentPlay({ videoElement, timeoutsArray }) {
		for (const t of timeoutsArray) {
			clearTimeout(t);
		}
		timeoutsArray.splice(0);
		videoElement.pause();
	}

	async function playStep({ index, videoElement, videoData, timeoutsArray }) {
		cancelCurrentPlay({ videoElement, timeoutsArray });
		const { end } = videoData.timestamps[index];
		let { start } = videoData.timestamps[index];
		if (undefined === start) {
			({ end: start } = 0 === index ? { end: 0 } : videoData.timestamps[index - 1]);
		}
		videoElement.currentTime = videoData.startTime + start;
		videoElement.play();
		timeoutsArray.push(setTimeout(() => videoElement.pause(), (end - start) * 1000));
	}

	async function loadVideoData({ url }) {
		const repoName = getUrlParam({ url, key: "repo" });
		const videoData = await fetch(`https://raw.githubusercontent.com/CADKatan/${repoName}/main/assemblyInfo.json`,{
			cache: "no-cache",
		}).then(r => r.json());
		return videoData;
	}

	window.addEventListener("load", async () => {
		// elements
		const video = document.getElementById("video");
		const introCover = document.getElementById("introCover");
		const totalStepsSpan = document.getElementById("totalSteps");
		const currentStepSpan = document.getElementById("currentStep");
		const introBtn = document.getElementById("introBtn");
		const introBtnText = introBtn.querySelector("span");
		const errorDetails = document.getElementById("errorDetails");
		const nextStepBtn = document.getElementById("nextBtn");
		const replayBtn = document.getElementById("replayBtn");
		const prevStepBtn = document.getElementById("prevBtn");

		// state variables
		const timeouts = [];
		let currentStep = 0;
		let videoData = null;
		const videoMetaLoadedPromise = new Promise(r => {
			video.addEventListener("loadedmetadata", r)
		})

		// local helper functions
		const setButtonsDisabled = () => {
			nextStepBtn.disabled = (videoData.timestamps.length - 1 === currentStep);
			prevStepBtn.disabled = (0 === currentStep);
		}
		const setStepCounter = () => {
			totalStepsSpan.innerText = videoData.timestamps.length;
			currentStepSpan.innerText = currentStep + 1;
		}
		const playCurrentStep = () => {
			setStepCounter();
			playStep({
				index: currentStep,
				videoElement: video,
				timeoutsArray: timeouts,
				videoData
			})
		};
		const playNextStep = () => {
			currentStep = Math.min(currentStep + 1, videoData.timestamps.length - 1);
			setButtonsDisabled();
			playCurrentStep();
		};
		const playPrevStep = () => {
			currentStep = Math.max(currentStep - 1, 0);
			setButtonsDisabled();
			playCurrentStep();
		};

		// event handlers
		introBtn.addEventListener("click", async () => {

			setStepCounter();
			introCover.style.opacity = 0;
			setTimeout(() => {
				introCover.style.display = "none";
				playCurrentStep();
			}, 1000);
		});
		nextStepBtn.addEventListener("click", playNextStep);
		replayBtn.addEventListener("click", playCurrentStep);
		prevStepBtn.addEventListener("click", playPrevStep);

		// initial load
		try {
			videoData = await loadVideoData({ url: location.href });
			setButtonsDisabled();
			video.src = videoData.src;
			videoData.startTime = (await videoMetaLoadedPromise).target.currentTime;
			Object.assign(video.style, videoData.videoElementStyle || {});
			introBtnText.innerText = "Let's build!"
			introBtn.disabled = false;
		} catch (e) {
			introCover.classList.add("loadError")
			introBtnText.innerText = "Oh no!"
			errorDetails.innerText = e.toString();
		}
	});
})();

