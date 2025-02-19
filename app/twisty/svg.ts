import { parse } from "../../src/alg/index";
import { TwistyPlayer } from "../../src/twisty/index";

window.addEventListener("load", () => {
  const twistyPlayer = new TwistyPlayer({
    puzzle: "3x3x3",
    visualization: "2D",
    alg: parse("U M' U' R' U' R U M2' U' R' U r"),
  });
  document.body.appendChild(twistyPlayer);
});
