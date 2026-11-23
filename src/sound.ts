import { VoicePlayer } from "@waldrumpus/orb";

export function loadVoices(): VoicePlayer {
  return new VoicePlayer({
    welcome: "assets/audio/wizard/cartridge/welcome.wav",
    hurt: "assets/audio/wizard/cartridge/hurt.wav",
    fireball: "assets/audio/wizard/cartridge/spell.wav",
    minion: "assets/audio/wizard/cartridge/minion.wav",
    victory: "assets/audio/wizard/cartridge/victory.wav",
    hold: "assets/audio/wizard/cartridge/hold.wav",
    itsover: "assets/audio/wizard/cartridge/itsover.wav",
  });
}
