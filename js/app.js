import { sounds, defaultPresets } from "./soundData.js";
import { SoundManager } from "./soundManager.js";

class AmbientMixer {
  //Initialize dependencies and default state
  constructor() {
    this.soundsManager = new SoundManager();
    this.ui = null;
    this.presetManager = null;
    this.timer = null;
    this.currentSoundState = {};
    this.isInitialized = false;
  }
  init() {
    try {
      this.loadAllSounds();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize app: ", error);
    }
  }
  //Load All Sounds
  loadAllSounds() {
    sounds.forEach((sound) => {
      const audioUrl = `audio/${sound.file}`;
      const success = this.soundsManager.loadsound(sound.id, audioUrl);
      if(!success){
        console.warn(`Failed to load sound: ${sound.name} from ${audioUrl}`);
      }
    });
  }
}
//Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new AmbientMixer();
  app.init();

});
