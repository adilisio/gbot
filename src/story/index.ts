import './ch1';
import './ch2';
import './ch3';
import './ch4';
import './ch5';
import type { ScriptAPI } from '../overworld/script';

export function registerStory() { /* maps register on import */ }

export async function newGameIntro(s: ScriptAPI) {
  await s.radio([
    ['MARLOW', 'Good evening, Wickhaven. Or good night. Or good whatever-it-is - hard to tell anymore, with the lights going out.'],
    ['MARLOW', 'You\'re listening to WKHV, 1450 on your dial, broadcasting from the old Calloway light. I\'m Marlow. This is the Night Owl Hour.'],
    ['MARLOW', 'For the young folks: a hundred years ago the Long Swell drowned the shore, and our great-grandparents built a city of lanterns on top of the water. The Heartwick has carried us ever since.'],
    ['MARLOW', 'Lately the lanterns are going dark. One street a night. The Guild says don\'t panic. I say: keep your radio on, and keep a light in the window.'],
    ['MARLOW', 'And to the night couriers out there, running parcels through the dark: this one\'s for you.'],
  ]);
  await s.chapter(1, 'Low Wick', 'The lights are going out.');
  await s.say(null, 'Low Wick Docks. Your courier\'s satchel is light. Your lantern is lighter. You haven\'t had a glimmer of your own since last winter.');
  s.objective('Report to Postmistress Odile at the Courier Post.');
}
