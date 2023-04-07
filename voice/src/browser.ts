/*

const mediaStream = new MediaStream([consumer.track]);
    const audio = new Audio();
audio.srcObject = mediaStream;
    audio.load();
    audio.play();

async startProducing(type: ProduceType) {
    switch (type) {
      case "audio": {
        if (this.client?.audioProducer !== undefined) return alert("No audio producer.");

        if (navigator.mediaDevices === undefined) return alert("No media devices.");

        const mediaDevice = window.localStorage.getItem("audioInputDevice");

        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: mediaDevice ? { deviceId: mediaDevice } : true,
          });

          await this.client?.startProduce(mediaStream.getAudioTracks()[0], "audio");
        } catch (err) {
          alert("WebRTC Error: " + err);
        }
      }
    }
    this.syncState();
  }

*/
