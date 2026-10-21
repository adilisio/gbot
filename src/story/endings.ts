import { G, flag } from '../state';
import { SPECIES } from '../data/glimmers';

type Page = { title: string; body: string; mon?: string; tint: string };

export function endingPages(id: string): Page[] {
  const lead = G.team[0]?.sp || 'cindle';
  const leadName = SPECIES[lead].name;
  const P: Page[] = [];
  const gold = '#ffd58a', blue = '#9fd8ff', green = '#9fffd0';
  const fenn = flag('c1') === 2
    ? 'Collector Fenn was made Senior Collector. He kept a small moth-shaped scar on his hand and never told anyone how he got it.'
    : 'Fenn quit the Guild a month later and took up fishing. He says the moths still follow him, and he lets them.';
  const vale = flag('valeAlly')
    ? 'Captain Vale\'s Kite Crews painted a courier\'s lantern on every sail.'
    : 'Captain Vale never did forgive you for that fight on her mast. She still tells the story, though, and it gets better every time.';
  const jun = flag('junAlly')
    ? 'Juniper runs the Kitefall route now. She leaves a lantern in her window every night - not because she\'s afraid of the dark, but so others won\'t be.'
    : 'Juniper left Wickhaven in the spring. She sends postcards. They all say the same thing: "Still faster than you."';
  const pip = flag('sprigReturned') ? 'Pip and Sprig grew up together. Sprig never ran away again.' : 'Somewhere in the Reedmoss, a little fern with a curl on top still waits for someone to call its name.';

  if (id === 'gilded') {
    P.push({ title: 'ENDING I - THE GILDED NIGHT', tint: gold, mon: 'heartwick', body: 'The Hush Mother sank back into the lake, and the Binding took hold. Gold thread rose from every glimmer in Wickhaven and wound itself into the Heartwick, and the great lantern blazed brighter than it had in a hundred years.' });
    P.push({ title: 'ENDING I - THE GILDED NIGHT', tint: gold, mon: lead, body: `${leadName} was the last to go. It looked back at you once, from inside the gold, and then it was part of the light. The city never fell. The city never went dark. No glimmer ever drifted down a street again.` });
    P.push({ title: 'ENDING I - THE GILDED NIGHT', tint: gold, body: `Provost Calder kept her word: no one in Wickhaven ever drowned. She also never slept well again. ${fenn}` });
    P.push({ title: 'ENDING I - THE GILDED NIGHT', tint: gold, body: `${vale} ${jun}` });
    P.push({ title: 'ENDING I - THE GILDED NIGHT', tint: gold, body: (flag('c4') === 1 ? 'People remembered your broadcast. Some of them never forgave you. Some of them never forgave themselves. ' : '') + `WKHV went quiet. Marlow said there was nothing left worth saying at night, because there was no more night. ${pip}` });
    P.push({ title: 'THE GILDED NIGHT', tint: gold, body: 'You kept delivering parcels. The streets were always bright. Sometimes, on the very top of the Crown, you thought you could hear a fox-kit, or a seal, or a little sprout, laughing inside the light. It was probably the wind.' });
  } else if (id === 'lowtide') {
    P.push({ title: 'ENDING II - LOW TIDE', tint: blue, mon: 'hushmother', body: 'The Heartwick went out the way a candle does at the end of a long night: gently, and all at once. And the Hush Mother rose and caught her daughter, and the lake took Wickhaven in her arms.' });
    P.push({ title: 'ENDING II - LOW TIDE', tint: blue, body: 'The city did not drown. It floated. Lanterns became boats, rooftops became rafts, and by morning Wickhaven was a city on the water, lit by stars and by nothing else.' });
    P.push({ title: 'ENDING II - LOW TIDE', tint: blue, mon: lead, body: `${leadName} stayed with you. All the glimmers stayed with someone, or went home to the moss and the wind and the deep. They were wild again, and they came back to visit anyway.` });
    P.push({ title: 'ENDING II - LOW TIDE', tint: blue, body: `Aurelia Calder learned to row. She was terrible at it. Old Brannock taught her anyway. ${fenn}` });
    P.push({ title: 'ENDING II - LOW TIDE', tint: blue, body: `${vale} ${jun} Marlow broadcast from a fishing boat for the rest of his life, and on clear nights, if you tuned to 720, you could hear the drowned choir singing along.` });
    P.push({ title: 'LOW TIDE', tint: blue, body: `It was harder. It was darker. Nobody would ever call it easy. But every light in the new Wickhaven was one somebody had chosen to carry. ${pip}` });
  } else {
    P.push({ title: 'ENDING III - RELAY DAWN', tint: green, mon: 'heartwick', body: 'The Heartwick did not go out. It did not burn forever, either. It settled, slowly, like a bird coming down onto a branch - and every lantern in the city took a little of its weight.' });
    P.push({ title: 'ENDING III - RELAY DAWN', tint: green, body: 'Kite lines carried the light between rooftops. The relays carried it across the Heights. The lake hummed it up from below on 720. And every window in Wickhaven held one small, chosen flame.' });
    P.push({ title: 'ENDING III - RELAY DAWN', tint: green, mon: lead, body: `${leadName} lit your window every night. Glimmers chose who they lived with now, and how much light they gave. Most of them gave a little. Some of them gave a lot. None of them were ever bound.` });
    P.push({ title: 'ENDING III - RELAY DAWN', tint: green, body: `Provost Calder disbanded the Guild and founded the Relay Office, which is mostly a lot of paperwork and an excellent radio show. ${fenn}` });
    P.push({ title: 'ENDING III - RELAY DAWN', tint: green, body: `${vale} ${jun} ${pip}` });
    P.push({ title: 'ENDING III - RELAY DAWN', tint: green, body: 'The Heartwick sleeps now, up on the Crown, and dreams of the lake. Once a year, on the anniversary of that night, the whole city turns its lanterns toward it, and Marlow plays the Night Owl Hour until dawn.' });
    P.push({ title: 'RELAY DAWN', tint: green, body: '"This is WKHV, 1450. If you\'re still awake out there - and I know some of you are - leave a light on for the courier. She\'s still out there on her rounds. She always will be."' });
  }
  return P;
}
