# Link preview cards for Obsidian

#### first test version. <br> 
Works great for me.

## Example Preview:

<img width="540" alt="example preview" src="readme-src/Screenshot 2026-05-10 1122091.png">

## How to Install:
download lu-obsidian-link-preview.zip from the latest release  
-> unzip it and move the inner folder to your obsidian vault in the .obsidian/plugins/ folder  
-> enable it in the community plugin settings

## How To Use:
there are two ways of creating a preview card

### 1. Command Palette

> <img width="540" alt="example codeblock" src="readme-src/Screenshot 2026-05-10 144227.png">
>
> Add your link to the note, select it and click ctrl+p to open the command palette.  
> You have two options here:<br>
> - as Codeblock<br>
> search for "convert to link preview card"  
> - as inline block  
> -- please note this will render the preview only in reading mode  
> search for "convert to inline link preview card"

you can select simple text links like https://example.com and also named links like [this is blender](https://blender.org/)   
while www. isn`t necessary but supported in the link, https:// is always necessary  


### 2. Manual 
> create a codeblock with "link-preview" as identifier and add the plain link inside the codeblock.  
> or of course craete a manual inline link preview with [(lu-link-prev: https://example.com)]  
> Here is an example of both options:
>
> <img width="320" alt="example codeblock" src="readme-src/Screenshot 2026-05-10 144145.png">

I would be really glad if someone likes to try and can give a little bit feedback on how you would like to use it. I am happy about all feedback and wishes/ideas.

Also if you have questions or encounter bugs or other problems feel free to write me an email or open an Issue here on github, since it´s a really small addon it should be fast to fix.

like written above the codeblock works in edit and reading mode but the inline block works only in reading mode. will fix that someday.
Also planned:
- add custom title
- add size controll with 2 input options. 1.easy mode: just add small, medium or big to the identifier. 2. manual mode with actual css controll of width, height, color, etc.
    like [(lu-link-prev: https.ex.com, width: 40px, color: blue)]
    Till then you can of course globally controll all of that in the styles.css

License: GPL-3.0-or-later

Github: https://github.com/Lurian-Works
