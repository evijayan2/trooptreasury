from PIL import Image
import sys

def remove_background():
    input_path = "public/trooptreasury-logo-main.png"
    output_path = "public/trooptreasury-logo-transparent.png"
    
    print(f"Processing {input_path}...")
    
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        
        datas = img.getdata()
        
        # Get background color from top-left pixel
        bg_pixel = img.getpixel((0, 0))
        bg_r, bg_g, bg_b = bg_pixel[:3]
        
        print(f"Background color detected: RGB({bg_r}, {bg_g}, {bg_b})")
        
        new_data = []
        tolerance = 20
        
        for item in datas:
            # item is (r, g, b, a)
            r, g, b = item[:3]
            
            if abs(r - bg_r) < tolerance and abs(g - bg_g) < tolerance and abs(b - bg_b) < tolerance:
                new_data.append((0, 0, 0, 0)) # Transparent
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Success! Saved transparent logo to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    remove_background()
