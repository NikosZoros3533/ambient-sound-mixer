import { sounds, defaultPresets } from "./soundData.js";
import { SoundManager } from "./soundManager.js";
import { UI } from "./ui.js";

class AmbientMixer {
  //Initialize dependencies and default state
  constructor() {
    this.soundManager = new SoundManager();
    this.ui = new UI();
    this.presetManager = null;
    this.timer = null;
    this.currentSoundState = {};
    this.isInitialized = false;
  }
  init() {
    try {
      //Initialize UI
      this.ui.init();

      //Render sound cards using our sound data
      this.ui.renderSoundCards(sounds);

      //Setup all event listeners
      this.setupEventListeners();

      //Load all sounds
      this.loadAllSounds();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize app: ", error);
    }
  }

  //Setup all evert listeners
  setupEventListeners() {
    //Handle all clicks with event delegation
    document.addEventListener("click", async (e) => {
      //Check if play button was clicked
      if (e.target.closest(".play-btn")) {
        const soundId = e.target.closest(".play-btn").dataset.sound;
        this.toggleSound(soundId);
      }
    });

    //Handle volume slider changes
    document.addEventListener("input", (e) => {
      if (e.target.classList.contains("volume-slider")) {
        const soundId = e.target.dataset.sound;
        const volume = parseInt(e.target.value);
        this.setSoundVolume(soundId, volume);
      }
    });
  }

  //Load All Sounds
  loadAllSounds() {
    sounds.forEach((sound) => {
      const audioUrl = `audio/${sound.file}`;
      const success = this.soundManager.loadsound(sound.id, audioUrl);
      if (!success) {
        console.warn(`Failed to load sound: ${sound.name} from ${audioUrl}`);
      }
    });
  }

  //Toggle individual sound
  async toggleSound(soundId) {
    const audio = this.soundManager.audioElements.get(soundId);

    if (!audio) {
      console.error(`Audio element for sound ID ${soundId} not found.`);
      return false;
    }
    if (audio.paused) {
      //Get current slider value
      const card = document.querySelector(`[data-sound="${soundId}"]`);
      const slider = card.querySelector(".volume-slider");
      let volume = parseInt(slider.value);

      //if slider is at 0,default to 50%
      if (volume === 0) {
        volume = 50;
        this.ui.updateVolumeDisplay(soundId, volume);
      }

      //Set current sound state
      this.currentSoundState[soundId] = volume;

      //Play sound
      this.soundManager.setVolume(soundId, 50);
      await this.soundManager.playSound(soundId);
      this.ui.updateSoundPlayButton(soundId, true);
    } else {
      this.soundManager.pauseSound(soundId);
      this.ui.updateSoundPlayButton(soundId, false);
    }
  }

  //Set Sound volume
  setSoundVolume(soundId, volume) {
    //Update sound volume manager
    this.soundManager.setVolume(soundId, volume);
    //Update visual display
    this.ui.updateVolumeDisplay(soundId, volume);
  }
}

//Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new AmbientMixer();
  app.init();
});
