import os
import sys
brightness = sys.argv[1]
brightnessPercent = float(brightness)/100.0
rgbBrightness = float(brightnessPercent) * 255

print('got it: ' + str(rgbBrightness))

os.system('sudo python ulon.py ' + str(rgbBrightness))
