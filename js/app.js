import { sounds, defaultPresets } from "./soundData.js";
import { SoundManager } from "./soundManager.js";
import { UI } from "./ui.js";
import { PresetManager } from "./presetManager.js";

class AmbientMixer {
  //Initialize dependencies and default state
  constructor() {
    this.soundManager = new SoundManager();
    this.ui = new UI();
    this.presetManager = new PresetManager();
    this.timer = null;
    this.currentSoundState = {};
    this.masterVolume = 100;
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

      //Initialize sound states after loading sounds
      sounds.forEach((sound) => {
        this.currentSoundState[sound.id] = 0;
      });

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
      //Check if a default preset button was clicked
      if (e.target.closest(".preset-btn")) {
        const presetKey = e.target.closest(".preset-btn").dataset.preset;
        await this.loadPreset(presetKey);
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

    //Handle master volume changes
    const masterVolumeSlider = document.getElementById("masterVolume");
    if (masterVolumeSlider) {
      masterVolumeSlider.addEventListener("input", (e) => {
        const volume = parseInt(e.target.value);
        this.setMasterVolume(volume);
      });
    }

    //Handle master play/pause button
    if (this.ui.playPauseButton) {
      this.ui.playPauseButton.addEventListener("click", () => {
        this.toggleAllSounds();
      });
    }

    //Handle reset button
    if (this.ui.resetButton) {
      this.ui.resetButton.addEventListener("click", () => {
        this.resetAll();
      });
    }

    //Save preset button
    const saveButton = document.getElementById("savePreset");
    if (saveButton) {
      saveButton.addEventListener("click", () => {
        this.showSavePresetModal();
      });
    }

    //Confirm save preset button
    const confirmSaveButton = document.getElementById("confirmSave");
    if (confirmSaveButton) {
      confirmSaveButton.addEventListener("click", () => {
        this.saveCurrentPreset();
      });
    }

    //Cancel preset button
    const cancelSaveButton = document.getElementById("cancelSave");
    if (cancelSaveButton) {
      cancelSaveButton.addEventListener("click", () => {
        this.ui.hideModal();
      });
    }

    //Close modal if backdrop is clicked
    if (this.ui.modal) {
      this.ui.modal.addEventListener("click", (e) => {
        if (e.target === this.ui.modal) {
          this.ui.hideModal();
        }
      });
    }
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
      //Set current sound state
      this.currentSoundState[soundId] = 0;
    }
    //Update main play button state
    this.updateMainPlayButtonState();
  }

  //Toggle all sounds
  toggleAllSounds() {
    if (this.soundManager.isPlaying) {
      this.soundManager.pauseAll();
      this.ui.updateMainPlayButton(false);
      sounds.forEach((sound) => {
        this.ui.updateSoundPlayButton(sound.id, false);
      });
    } else {
      for (const [soundId, audio] of this.soundManager.audioElements) {
        const card = document.querySelector(`[data-sound=${soundId}]`);
        const slider = card.querySelector(".volume-slider");

        if (slider) {
          let volume = parseInt(slider.value);

          if (volume === 0) {
            volume = 50;
            slider.value = 50;
            this.ui.updateVolumeDisplay(soundId, 50);
          }

          this.currentSoundState[soundId] = volume;
          const effectiveVolume = (volume * this.masterVolume) / 100;
          audio.volume = effectiveVolume / 100;
          this.ui.updateSoundPlayButton(soundId, true);
        }
      }
      this.soundManager.playAll();
      this.ui.updateMainPlayButton(true);
    }
  }

  //Set Sound volume
  setSoundVolume(soundId, volume) {
    //Set sound volume in state
    this.currentSoundState[soundId] = volume;

    //Calculate effective volume
    const effectiveVolume = (volume * this.masterVolume) / 100;
    const audio = this.soundManager.audioElements.get(soundId);
    if (audio) {
      audio.volume = effectiveVolume / 100;
    }

    //Update visual display
    this.ui.updateVolumeDisplay(soundId, volume);

    //Sync sounds
    this.updateMainPlayButtonState();
  }

  //Set Master Volume
  setMasterVolume(volume) {
    this.masterVolume = volume;

    //Update display
    const masterVolumeValue = document.getElementById("masterVolumeValue");
    if (masterVolumeValue) {
      masterVolumeValue.textContent = `${volume}%`;
    }
    this.applyMasterVolumeToAll();
  }

  //Apply master volume to all sounds
  applyMasterVolumeToAll() {
    for (const [soundId, audio] of this.soundManager.audioElements) {
      if (!audio.paused) {
        const card = document.querySelector(`[data-sound="${soundId}"]`);
        const slider = card?.querySelector(".volume-slider");
        if (slider) {
          const individualVolume = parseInt(slider.value);
          //Calculate effective volume(individual volume * master /100)
          const effectiveVolume = (individualVolume * this.masterVolume) / 100;
          audio.volume = effectiveVolume / 100;
        }
      }
    }
  }

  //Update main play button based on individual sounds
  updateMainPlayButtonState() {
    let anySoundsPlaying = false;
    for (const [soundId, audio] of this.soundManager.audioElements) {
      if (!audio.paused) {
        anySoundsPlaying = true;
        break;
      }
    }
    this.soundManager.isPlaying = anySoundsPlaying;
    this.ui.updateMainPlayButton(anySoundsPlaying);
  }

  //Reset everything to default state
  resetAll() {
    this.soundManager.stopAll();
    this.masterVolume = 100;
    sounds.forEach((sound) => {
      this.currentSoundState[sound.id] = 0;
    });
    this.ui.resetUI();
  }

  //Load a preset config
  loadPreset(presetKey) {
    const preset = defaultPresets[presetKey];
    if (!preset) {
      console.error(`Preset ${presetKey} not found.`);
      return;
    }
    this.soundManager.stopAll();
    sounds.forEach((sound) => {
      this.currentSoundState[sound.id] = 0;
      this.ui.updateVolumeDisplay(sound.id, 0);
      this.ui.updateSoundPlayButton(sound.id, false);
    });

    for (const [soundId, volume] of Object.entries(preset.sounds)) {
      this.currentSoundState[soundId] = volume;
      this.ui.updateVolumeDisplay(soundId, volume);
      const effectiveVolume = (volume * this.masterVolume) / 100;
      const audio = this.soundManager.audioElements.get(soundId);
      if (audio) {
        audio.volume = effectiveVolume / 100;
        audio.play();
        this.ui.updateSoundPlayButton(soundId, true);
      }
    }

    this.soundManager.isPlaying = true;
    this.ui.updateMainPlayButton(true);
  }

  //Show save preset modal
  showSavePresetModal() {
    const hasActiveSounds = Object.values(this.currentSoundState).some(
      (v) => v > 0
    );
    if (!hasActiveSounds) {
      alert("Please activate at least one sound to save a preset.");
      return;
    }
    this.ui.showModal();
  }

  //Save current preset
  saveCurrentPreset() {
    const nameInput = document.getElementById("presetName");
    const name = nameInput.value.trim();
    if (!name) {
      alert("Please enter a valid preset name.");
      return;
    }
    if (this.presetManager.presetNameExists(name)) {
      alert(
        `A preset with the name ${name} already exists. Please choose a different name.`
      );
      return;
    }
    const presetId = this.presetManager.savePreset(
      name,
      this.currentSoundState
    );
    this.ui.hideModal();
    console.log(`Preset ${name} saved with ID: ${presetId}`);
  }
}

//Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new AmbientMixer();
  app.init();
});
