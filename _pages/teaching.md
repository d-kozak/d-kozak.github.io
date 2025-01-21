---
layout: page
permalink: /teaching/
title: Teaching
description: The courses I am involved in as a PhD Student.
nav: true
nav_order: 7
related_publications: true
---

## FIT BUT

- IZP - Introduction to Programming Systems (teaching labs)
  - [2023-2024](https://www.fit.vut.cz/study/course/IZP/.en)
  - [2022-2023](https://www.fit.vut.cz/study/course/231045/.en?year=2022)
  - [2021-2022](https://www.fit.vut.cz/study/course/244899/.en?year=2021)
- IVS - Practical Aspects of Software Design (lecture about testing)
  - [2023-2024](https://www.fit.vut.cz/study/course/IVS/.en)
  - [2022-2023](https://www.fit.vut.cz/study/course/231042/.en?year=2022)
- GJA - Graphical User Interfaces in Java (lecture about Spring)
  - [2023-2024](https://www.fit.vut.cz/study/course/268202/.en)
  - [2023-2024 EN](https://www.fit.vut.cz/study/course/268203/.en)
  - [2022-2023](https://www.fit.vut.cz/study/course/259525/.en?year=2022)
  - [2022-2023 EN](https://www.fit.vut.cz/study/course/259524/.en?year=2022)

## Others

- Capstone Project (2023) at the [Baylor University](https://www.baylor.edu/).
  - I've remotely lead a group of bachelor students for their final project, which resulted in a research paper {% cite saner24 %}.


## Presentation Tips & Tricks
Below, I give a list of tips that I typically share with my students when discussing presentation-making. 
It is by no means exhaustive; I just try to highlight the most essential bits and pieces from my point of view.

Let's start with the most important rule of all: **Know your audience**. 
Techniques suitable for one domain might be completely wrong in another. 
We will focus purely on the *academic setting*, particularly *thesis and project presentations*, so keep that in mind.

### Typical Structure
You only have a few minutes, and the committee is typically interested in a few key elements, which does not leave much space for innovations.
I suggest keeping to the following structure:
- **Introduction/Motivation** - Start with a high-level overview but do not miss the motivation part. It is important not only to tell what you do but also *why it matters*. If you work on static analysis, show real-world bugs with high cost. If you work on optimizations, use concrete numbers to show how slow it is now.
- **State of the Art** - Introduce the domain in more detail but go only as deep as is necessary for the audience to understand the following slides. 
- **Your Contributions** - This is the core of the presentation, which can be divided between multiple slides. 
- **Experimental Evaluation** - Present the experimental setup (your benchmarks, machines you used for execution) and the results you obtained.
- **Conclusion** - Summarize your work in a few bullet points and stop. Leave this slide on during Q&A, as it can help you when answering questions. Also, whatever slide is on during Q&A will be visible for a very long time, so make it well and use it for advertising your work.

### General Tips
- Slides should be **self-contained**, i.e. explainable even without you as a presenter. 
While this may not be true for other settings, the committee will often only scan each of your slides in a few seconds before returning to writing emails,
so make your presentation friendly for this not-so-great but very real use case.
- Always **finish on time**. It is okay, sometimes even welcome, to finish early, but try to avoid not finishing in time at all costs. 
If the committee has to stop the presentation, because your time is over, the most relevant pieces may be missed, which would be wasteful.
- **Use bullet points**. Avoid whole sentences if possible. You can save quite a lot of space by taking a sentence, removing the filler words and subject, and leaving out only the infinitive of the noun with a few well-chosen words.
All the "nice" filler words can be said, but no need to write them into the presentation. 
- Use some form of **highlighting**, e.g. bold, italics, or colors, to prevent your slides from being just boring lists of text, but use the highlighting wisely and consistently. 
Choose a strategy (e.g., keywords in bold for each bullet point) and stick to it. And beware of overdoing it; use it to draw attention to the key parts.
- Be **clear** and **precise**. Do not use vague phrases. If you want to say something is slow, say how much. If you want to improve something, describe how exactly.
If you have developed some algorithm or methodology, describe how it works. You don't have to go into all the details, but the general intuition should be clear.
- Look at your presentation from the **point of view of the committee**. 
They might not have a background that you have, and they are tired of having to go through many presentations. 
Make their life easier by introducing everything that is not common knowledge across all IT domains.
- Be **prepared to answer questions**. Go through the presentation and collect the most probable questions you might get. 
Prepare satisfactory answers for each of them. Once you have a good answer, think about whether you can somehow put it directly on the slides to remove the need to 
answer the question in the first place. You can avoid many questions by being clear and precise in your explanation. 
Sometimes, you can intentionally keep a certain part a bit fuzzy to invite the committee to ask about it in Q&A, 
but that should happen intentionally, not just because you did not explain something properly.
- **Practice delivering your presentation**. Go through it multiple times in multiple days, making sure that you know the structure by heart. This will prevent you from being surprised by your own slides, and on top of that, it will allow you to bridge the slides, slightly introducing the next one even before you change the slides, which typically leaves a good impression. 
- **Don't memorize the presentation**. Know the key elements you want to say on each slide, but don't memorize the entire structure. You would risk being thrown out of balance if you "forget the next word", which can happen very quickly. If you want to memorize something, preparing **strong opening and closing phrases** may be helpful to avoid stress.
- Use **figures** and **diagrams**, but ensure their high resolution and font size and introduce them properly (even in text on slides). They should not just stick there as a decoration; they should help in your explanations.