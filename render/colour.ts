interface RGB {
  r: number;
  g: number;
  b: number;
}


abstract class Colour {
  // static class for colour-related operations

  static padZero(str : string, len : number = 2) : string {
      var zeros = new Array(len).join('0');
      return (zeros + str).slice(-len);
  }

  static strToRGB(hex : string) : RGB {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var rgbObj : RGB =  {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
    };
    return rgbObj;
  }

  static RGBToStr(rgbObj : RGB) : string {
    return "#"+ Colour.padZero(rgbObj.r.toString(16)) +
                Colour.padZero(rgbObj.g.toString(16)) +
                Colour.padZero(rgbObj.b.toString(16));
  }

  static bwColour(hex : string ) : string {
    let rgbObj = Colour.strToRGB(hex);
    // http://stackoverflow.com/a/3943023/112731
    return (rgbObj.r * 0.299 + rgbObj.g * 0.587 + rgbObj.b * 0.114) > 186
        ? '#ffffff'
        : '#000000';
  }

  static greyscaleColour(hex : string) : string {
    let rgbObj : RGB = Colour.strToRGB(hex);
    let greyscaleColour : number = Math.round(rgbObj.r * 0.299 + rgbObj.g * 0.587 + rgbObj.b * 0.114);
    rgbObj = {r: greyscaleColour, g: greyscaleColour, b: greyscaleColour};
    return Colour.RGBToStr(rgbObj);
  }

  static invertColour(hex : string) : string {
    // invert color components
    let rgbObj = Colour.strToRGB(hex);
    rgbObj.r = (255 - rgbObj.r);
    rgbObj.g = (255 - rgbObj.g);
    rgbObj.b = (255 - rgbObj.b);
    return Colour.RGBToStr(rgbObj);
  }
}
