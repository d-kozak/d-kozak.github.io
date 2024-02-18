---
layout: page
title: Graal MVP
description: Microservice Visualization Platform
img: assets/img/graalmvp.png
importance: 1
category: work
related_publications: true
github: https://github.com/cloudhubs/graal_mvp
---

The goal of this project is to utilize [GraalVM Native Image](https://www.graalvm.org/latest/reference-manual/native-image/) as a *static analysis tools* for microservices. In the first phase, we have extended Native Image compilation pipeline and collected information about entities, rest endpoints and rest calls for each microservice. Then, we have merged the per-microservice data into global *Service* and *Domain* views. 

<div class="row">
    <div class="col-sm"></div>
    <div class="col-8">
    {% include figure.liquid loading="eager" path="assets/img/GraalPhases.jpg" title="Graal MVP Phases" class="img-fluid rounded z-depth-1 mx-auto d-block" %}
    </div>
    <div class="col-sm"></div>
</div>
<div class="caption">
    High level overview of the Graal MVP infrastructure
</div>

We have published our first steps at SANER 2024 {% cite saner24 %}.