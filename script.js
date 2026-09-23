/* =================================================================
   Bruna Blauth — Mentoria Abdômen Lucrativo
   ================================================================= */
(function () {
  'use strict';

  var reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===============================================================
     1. SMOOTH SCROLL (Lenis)
     Se a lib não carregar, o CSS mantém o scroll-behavior nativo.
     =============================================================== */
  var lenis = null;

  function iniciarLenis() {
    if (reduzirMovimento || typeof window.Lenis !== 'function') return;

    lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6
    });

    /* Com GSAP no ar, o ticker dele conduz o Lenis e mantém o ScrollTrigger
       em dia — dois loops de requestAnimationFrame brigariam entre si.
       Sem GSAP, o Lenis roda no próprio loop. */
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (tempo) { lenis.raf(tempo * 1000); });
      window.gsap.ticker.lagSmoothing(0);
      return;
    }

    function raf(tempo) {
      lenis.raf(tempo);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* Âncoras internas passam pelo Lenis quando ele existe */
  function iniciarAncoras() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      /* CTAs abrem o pop up do formulário em vez de rolar */
      if (link.hasAttribute('data-abrir-form')) return;
      link.addEventListener('click', function (e) {
        var alvo = document.querySelector(link.getAttribute('href'));
        if (!alvo) return;
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(alvo, { offset: 0, duration: 1.2 });
        } else {
          alvo.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth' });
        }
      });
    });
  }

  /* ===============================================================
     2. SECTION 2 — CARROSSEL COM AS SETAS
     =============================================================== */
  function iniciarCarrossel() {
    var wrapper = document.querySelector('[data-carousel]');
    var track = document.querySelector('[data-carousel-track]');
    var btnPrev = document.querySelector('[data-carousel-prev]');
    var btnNext = document.querySelector('[data-carousel-next]');
    if (!wrapper || !track || !btnPrev || !btnNext) return;

    var posicao = 0;

    function passo() {
      var card = track.querySelector('.card-p');
      if (!card) return 410;
      var estilo = window.getComputedStyle(track);
      return card.getBoundingClientRect().width + parseFloat(estilo.columnGap || estilo.gap || 10);
    }

    function limite() {
      return Math.max(0, track.scrollWidth - wrapper.clientWidth);
    }

    function aplicar() {
      posicao = Math.max(0, Math.min(posicao, limite()));
      track.style.transform = 'translate3d(' + -posicao + 'px, 0, 0)';
      btnPrev.disabled = posicao <= 0.5;
      btnNext.disabled = posicao >= limite() - 0.5;
    }

    btnPrev.addEventListener('click', function () { posicao -= passo(); aplicar(); });
    btnNext.addEventListener('click', function () { posicao += passo(); aplicar(); });

    /* arrastar também funciona no carrossel */
    var arrastando = false, inicioX = 0, inicioPos = 0, moveu = 0;

    function comecar(x) {
      arrastando = true; inicioX = x; inicioPos = posicao; moveu = 0;
      track.style.transition = 'none';
    }
    function mover(x) {
      if (!arrastando) return;
      var delta = x - inicioX;
      moveu = Math.abs(delta);
      posicao = inicioPos - delta;
      posicao = Math.max(0, Math.min(posicao, limite()));
      track.style.transform = 'translate3d(' + -posicao + 'px, 0, 0)';
    }
    function terminar() {
      if (!arrastando) return;
      arrastando = false;
      track.style.transition = '';
      aplicar();
    }

    wrapper.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      comecar(e.clientX);
    });
    window.addEventListener('pointermove', function (e) { mover(e.clientX); });
    window.addEventListener('pointerup', terminar);
    window.addEventListener('pointercancel', terminar);
    wrapper.addEventListener('click', function (e) {
      if (moveu > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    window.addEventListener('resize', aplicar);
    aplicar();
  }

  /* ===============================================================
     3. SECTION 4 — FAIXAS "MENTORIA ABDÔMEN LUCRATIVO"
     Puramente decorativas (aria-hidden), geradas aqui pra não
     poluir o HTML com 32 repetições.
     =============================================================== */
  function iniciarFaixas() {
    var TEXTO = 'Mentoria Abdômen Lucrativo';
    var VELOCIDADE = 55; /* pixels por segundo */

    function montar(faixa) {
      var inner = faixa.querySelector('.faixa__inner');
      if (!inner) return;

      var grupo = document.createElement('div');
      grupo.className = 'faixa__grupo';
      inner.innerHTML = '';
      inner.appendChild(grupo);

      /* Enche até o grupo ficar mais largo que a faixa: é isso que garante
         que a emenda das cópias nunca entre na área visível. O contador para
         em número par pra a alternância de cor não repetir na emenda. */
      var i = 0;
      while (i < 60 && (grupo.offsetWidth < faixa.offsetWidth || i % 2 !== 0)) {
        var item = document.createElement('span');
        item.className = 'faixa__item' + (i % 2 ? ' faixa__item--alt' : '');
        item.textContent = TEXTO;
        grupo.appendChild(item);
        i++;
      }

      var copia = grupo.cloneNode(true);
      inner.appendChild(copia);

      /* velocidade constante em qualquer largura de tela */
      inner.style.animationDuration = (grupo.offsetWidth / VELOCIDADE).toFixed(1) + 's';
    }

    var faixas = Array.prototype.slice.call(document.querySelectorAll('.faixa'));
    faixas.forEach(montar);

    /* remonta ao redimensionar: a faixa mede 140% da tela e o grupo
       precisa continuar cobrindo essa largura */
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { faixas.forEach(montar); }, 200);
    });

    /* só anima enquanto a section 4 está na tela */
    var s4 = document.querySelector('.s4');
    if (s4 && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        s4.classList.toggle('s4--visivel', entradas[0].isIntersecting);
      }, { rootMargin: '200px 0px' }).observe(s4);
    } else if (s4) {
      s4.classList.add('s4--visivel');
    }
  }

  /* ===============================================================
     4. SECTION 6 — DEPOIMENTOS: ARRASTAR PARA O LADO
     =============================================================== */
  function iniciarDepoimentos() {
    var caixa = document.querySelector('[data-drag]');
    var dots = document.querySelector('[data-drag-dots]');
    if (!caixa) return;

    var arrastando = false, inicioX = 0, inicioScroll = 0, moveu = 0;

    caixa.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      arrastando = true;
      moveu = 0;
      inicioX = e.clientX;
      inicioScroll = caixa.scrollLeft;
      caixa.classList.add('is-arrastando');
      /* se a captura falhar, o arraste ainda funciona pelos listeners locais */
      try { caixa.setPointerCapture(e.pointerId); } catch (err) {}
    });

    caixa.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      e.preventDefault();
      var delta = e.clientX - inicioX;
      moveu = Math.abs(delta);
      caixa.scrollLeft = inicioScroll - delta;
    });

    function soltar(e) {
      if (!arrastando) return;
      arrastando = false;
      caixa.classList.remove('is-arrastando');
      if (e && e.pointerId != null && caixa.hasPointerCapture(e.pointerId)) {
        caixa.releasePointerCapture(e.pointerId);
      }
    }

    caixa.addEventListener('pointerup', soltar);
    caixa.addEventListener('pointercancel', soltar);
    caixa.addEventListener('pointerleave', soltar);
    caixa.addEventListener('click', function (e) {
      if (moveu > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* roda do mouse na horizontal, sem sequestrar o scroll da página */
    caixa.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      caixa.scrollLeft += e.deltaX;
    }, { passive: false });

    /* pontinhos de progresso */
    if (dots) {
      var bolinhas = Array.prototype.slice.call(dots.querySelectorAll('.dot'));
      var atualizar = function () {
        var maximo = caixa.scrollWidth - caixa.clientWidth;
        var progresso = maximo > 0 ? caixa.scrollLeft / maximo : 0;
        var ativo = Math.min(bolinhas.length - 1, Math.round(progresso * (bolinhas.length - 1)));
        bolinhas.forEach(function (d, i) { d.classList.toggle('is-ativo', i === ativo); });
      };
      caixa.addEventListener('scroll', atualizar, { passive: true });
      window.addEventListener('resize', atualizar);
      atualizar();
    }
  }

  /* ===============================================================
     5. SECTION 6 — LIGHTBOX: clicar num depoimento abre ele ampliado
     Vale pra desktop, tablet e mobile. O guarda de arraste da régua
     (capture em [data-drag]) já impede que um arraste vire clique.
     =============================================================== */
  function iniciarLightbox() {
    var caixa = document.querySelector('[data-drag]');
    var lb = document.getElementById('lightbox');
    if (!caixa || !lb || typeof lb.showModal !== 'function') return;

    var img = lb.querySelector('.lightbox__img');
    var btnFechar = lb.querySelector('.lightbox__fechar');
    var origem = null;

    /* só anuncia que é clicável se o JS estiver de pé */
    var itens = Array.prototype.slice.call(caixa.querySelectorAll('.dep'));
    itens.forEach(function (im) {
      im.tabIndex = 0;
      im.setAttribute('role', 'button');
    });

    function abrir(alvo) {
      origem = alvo;
      img.src = alvo.currentSrc || alvo.src;
      img.alt = alvo.alt || '';
      lb.classList.remove('is-saindo');
      lb.showModal();
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
    }

    function fechar() {
      if (!lb.open) return;
      lb.classList.add('is-saindo');
      setTimeout(function () {
        lb.close();
        lb.classList.remove('is-saindo');
        img.removeAttribute('src');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
        if (origem) { origem.focus(); origem = null; }
      }, reduzirMovimento ? 0 : 200);
    }

    /* O arraste chama setPointerCapture na régua, e isso faz o navegador
       redirecionar o 'click' pra ela — e.target no clique NÃO é a imagem.
       Por isso guardo qual imagem foi pressionada ainda no pointerdown,
       que é o único momento em que o alvo real está disponível. */
    var pressionada = null;

    caixa.addEventListener('pointerdown', function (e) {
      pressionada = e.target && e.target.closest ? e.target.closest('.dep') : null;
    });

    caixa.addEventListener('click', function () {
      if (pressionada) abrir(pressionada);
    });

    caixa.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var alvo = e.target.closest('.dep');
      if (!alvo) return;
      e.preventDefault();
      abrir(alvo);
    });

    btnFechar.addEventListener('click', fechar);

    /* clique no fundo (fora da imagem) fecha */
    lb.addEventListener('click', function (e) {
      if (e.target === lb) fechar();
    });

    /* Esc: o <dialog> dispara 'cancel'; intercepto pra animar a saída */
    lb.addEventListener('cancel', function (e) {
      e.preventDefault();
      fechar();
    });
  }

  /* ===============================================================
     5b. POP UP DO FORMULÁRIO — aberto pelos botões CTA
     Sem suporte a <dialog>, os CTAs mantêm o comportamento de âncora.
     =============================================================== */
  /* Copia as UTMs do link (?utm_source=...) para os campos ocultos do
     formulário. Guarda na sessão pra não perder se a pessoa recarregar
     a página sem os parâmetros. */
  function preencherUtms(form) {
    var CHAVES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var params = new URLSearchParams(location.search);
    var temNoLink = CHAVES.some(function (k) { return params.get(k); });
    var utms = {};

    if (temNoLink) {
      CHAVES.forEach(function (k) { utms[k] = params.get(k) || ''; });
      try { sessionStorage.setItem('utms', JSON.stringify(utms)); } catch (e) {}
    } else {
      try { utms = JSON.parse(sessionStorage.getItem('utms')) || {}; } catch (e) {}
    }

    CHAVES.forEach(function (k) {
      var campo = form.elements[k];
      /* em input hidden, .value também vira o valor padrão,
         então o form.reset() não apaga */
      if (campo && utms[k]) campo.value = String(utms[k]).slice(0, 200);
    });
  }

  function iniciarFormPop() {
    var pop = document.getElementById('form-pop');
    var ctas = Array.prototype.slice.call(document.querySelectorAll('[data-abrir-form]'));
    if (!pop || !ctas.length) return;

    if (typeof pop.showModal !== 'function') {
      ctas.forEach(function (cta) { cta.removeAttribute('data-abrir-form'); });
      return;
    }

    var form = pop.querySelector('form');
    var btnFechar = pop.querySelector('.form-pop__fechar');
    var titulo = pop.querySelector('.form-pop__titulo');
    var sucesso = pop.querySelector('.form-pop__sucesso');
    var aviso = pop.querySelector('.form-pop__aviso');
    var botao = form.querySelector('.form-pop__botao');
    var botaoTexto = botao.querySelector('.form-pop__botao-texto');
    var TEXTO_BOTAO = botaoTexto.textContent;
    var origem = null;
    var enviado = false;

    preencherUtms(form);

    /* depois de um envio, abrir de novo mostra o formulário limpo */
    function reiniciar() {
      enviado = false;
      form.reset();
      /* reaplica as mensagens de campo vazio das regras */
      Array.prototype.forEach.call(form.querySelectorAll('.form-pop__campo'), function (campo) {
        campo.dispatchEvent(new Event('change'));
      });
      form.hidden = false;
      titulo.hidden = false;
      sucesso.hidden = true;
      aviso.hidden = true;
    }

    function abrir(cta) {
      if (enviado) reiniciar();
      origem = cta;
      pop.classList.remove('is-saindo');
      pop.showModal();
      pop.scrollTop = 0;
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
    }

    function fechar() {
      if (!pop.open) return;
      pop.classList.add('is-saindo');
      setTimeout(function () {
        pop.close();
        pop.classList.remove('is-saindo');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
        if (origem) { origem.focus(); origem = null; }
      }, reduzirMovimento ? 0 : 200);
    }

    ctas.forEach(function (cta) {
      cta.addEventListener('click', function (e) {
        e.preventDefault();
        abrir(cta);
      });
    });

    btnFechar.addEventListener('click', fechar);

    /* clique no fundo (fora do card) fecha */
    pop.addEventListener('click', function (e) {
      if (e.target === pop) fechar();
    });

    pop.addEventListener('cancel', function (e) {
      e.preventDefault();
      fechar();
    });

    /* Envio: o navegador só dispara 'submit' com todos os campos válidos.
       Os dados vão pra função /api/enviar (Vercel), que manda o e-mail
       pelo Resend. */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (botao.disabled) return;

      var dados = {};
      Array.prototype.forEach.call(form.elements, function (campo) {
        if (campo.name) dados[campo.name] = campo.value;
      });

      botao.disabled = true;
      botaoTexto.textContent = 'Enviando...';
      aviso.hidden = true;

      fetch('/api/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      })
        .then(function (resposta) {
          return resposta.json().catch(function () { return {}; }).then(function (corpo) {
            if (!resposta.ok || !corpo.ok) throw new Error(corpo.erro || 'Falha no envio');
          });
        })
        .then(function () {
          enviado = true;
          /* Evento pro Google Tag Manager marcar a conversão. Só vai pra
             página de obrigado depois que as tags dispararem (eventCallback);
             se o GTM estiver bloqueado, o limite de 2s garante o redirecionamento. */
          var redirecionou = false;
          var irParaObrigado = function () {
            if (redirecionou) return;
            redirecionou = true;
            window.location.href = '/obrigado.html';
          };
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'lead_enviado',
            treinamento: dados.treinamento,
            eventCallback: irParaObrigado,
            eventTimeout: 2000
          });
          setTimeout(irParaObrigado, 2000);
          /* mantém "Enviando..." até a página trocar */
          return new Promise(function () {});
        })
        .catch(function () {
          aviso.textContent = 'Não foi possível enviar agora. Confira sua conexão e tente novamente.';
          aviso.hidden = false;
        })
        .then(function () {
          botao.disabled = false;
          botaoTexto.textContent = TEXTO_BOTAO;
        });
    });
  }

  /* ===============================================================
     5c. REGRAS DOS CAMPOS DO FORMULÁRIO
     Nome: só letras (com acento) e espaço entre os nomes.
     WhatsApp: máscara (DD) 99999-9999 — ou (DD) 9999-9999 pra fixo.
     E-mail: formato nome@dominio.com.
     As mensagens aparecem no balão nativo do navegador ao enviar.
     =============================================================== */
  function iniciarRegrasForm() {
    var form = document.getElementById('form-mentoria');
    if (!form) return;

    var nome = form.querySelector('[data-regra="nome"]');
    var zap = form.querySelector('[data-regra="whatsapp"]');
    var email = form.querySelector('[data-regra="email"]');

    /* letras com acento: À-Ö, Ø-ö, ø-ÿ (escritas em \u pra não depender
       da codificação do arquivo) */
    var LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
    var EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

    /* Troca o valor do campo sem jogar o cursor pro final: conta quantos
       caracteres "que importam" havia antes do cursor e devolve o cursor
       depois da mesma quantidade no valor novo. */
    function reescrever(campo, novo, importa) {
      var antigo = campo.value;
      if (novo === antigo) return;
      var cursor = campo.selectionStart == null ? antigo.length : campo.selectionStart;
      var conta = 0;
      for (var i = 0; i < cursor; i++) {
        if (importa(antigo.charAt(i))) conta++;
      }
      campo.value = novo;
      var pos = 0;
      while (pos < novo.length && conta > 0) {
        if (importa(novo.charAt(pos))) conta--;
        pos++;
      }
      if (document.activeElement === campo) campo.setSelectionRange(pos, pos);
    }

    function soDigitos(v) { return v.replace(/\D/g, ''); }
    function ehDigito(c) { return c >= '0' && c <= '9'; }

    /* ---------- Nome ---------- */
    if (nome) {
      var ehLetraOuEspaco = function (c) { return c === ' ' || LETRA.test(c); };

      var validarNome = function () {
        var letras = nome.value.replace(/ /g, '').length;
        nome.setCustomValidity(nome.value && letras < 2 ? 'Digite seu nome.' : '');
      };

      nome.addEventListener('input', function () {
        var limpo = nome.value
          .split('').filter(ehLetraOuEspaco).join('')
          .replace(/ {2,}/g, ' ')
          .replace(/^ /, '');
        reescrever(nome, limpo, ehLetraOuEspaco);
        validarNome();
      });

      nome.addEventListener('blur', function () {
        nome.value = nome.value.trim();
        validarNome();
      });
    }

    /* ---------- WhatsApp ---------- */
    if (zap) {
      var formatarZap = function (digitos) {
        /* colou com +55 na frente */
        if (digitos.length > 11 && digitos.indexOf('55') === 0) digitos = digitos.slice(2);
        digitos = digitos.slice(0, 11);
        if (!digitos) return '';
        if (digitos.length <= 2) return '(' + digitos;

        var ddd = digitos.slice(0, 2);
        var numero = digitos.slice(2);
        if (numero.length <= 4) return '(' + ddd + ') ' + numero;

        var corte = digitos.length === 11 ? 5 : 4;
        return '(' + ddd + ') ' + numero.slice(0, corte) + '-' + numero.slice(corte);
      };

      var validarZap = function () {
        var d = soDigitos(zap.value);
        var msg = '';
        if (d.length) {
          if (d.length < 10) msg = 'Digite o WhatsApp completo com DDD.';
          else if (!/^[1-9]{2}/.test(d)) msg = 'DDD inválido.';
          else if (d.length === 11 && d.charAt(2) !== '9') msg = 'Número de celular inválido.';
        }
        zap.setCustomValidity(msg);
      };

      var digitosAntes = '';

      zap.addEventListener('input', function (e) {
        var cursor = zap.selectionStart == null ? zap.value.length : zap.selectionStart;
        var d = soDigitos(zap.value);
        var antes = soDigitos(zap.value.slice(0, cursor)).length;

        /* Apagou só um "(", ")", espaço ou "-": sem isso a máscara
           colocaria o símbolo de volta e o backspace travaria.
           Nesse caso apaga o dígito vizinho. */
        if (e.inputType && e.inputType.indexOf('delete') === 0 && d === digitosAntes) {
          if (e.inputType === 'deleteContentBackward' && antes > 0) {
            d = d.slice(0, antes - 1) + d.slice(antes);
            antes--;
          } else if (e.inputType === 'deleteContentForward' && antes < d.length) {
            d = d.slice(0, antes) + d.slice(antes + 1);
          }
        }

        var novo = formatarZap(d);
        /* se o +55 foi removido, o cursor vai pro fim */
        if (soDigitos(novo).length !== d.length) antes = soDigitos(novo).length;

        zap.value = novo;
        var pos = 0;
        var conta = antes;
        while (pos < novo.length && conta > 0) {
          if (ehDigito(novo.charAt(pos))) conta--;
          pos++;
        }
        if (document.activeElement === zap) zap.setSelectionRange(pos, pos);

        digitosAntes = soDigitos(novo);
        validarZap();
      });

      zap.addEventListener('blur', validarZap);
    }

    /* ---------- E-mail ---------- */
    if (email) {
      var validarEmail = function () {
        var v = email.value;
        email.setCustomValidity(v && !EMAIL.test(v) ? 'Digite um e-mail válido. Ex: nome@email.com' : '');
      };

      /* campo type="email" não permite mexer no cursor, então só limpa */
      email.addEventListener('input', function () {
        var semEspaco = email.value.replace(/\s/g, '');
        if (semEspaco !== email.value) email.value = semEspaco;
        validarEmail();
      });

      email.addEventListener('blur', validarEmail);
    }

    /* ---------- Todos obrigatórios: asterisco preto no que ficar vazio ----------
       Cada campo ganha um invólucro com o asterisco; a legenda vem do
       placeholder (ou da primeira opção, no dropdown). */
    Array.prototype.slice.call(form.querySelectorAll('.form-pop__campo')).forEach(function (campo) {
      campo.required = true;

      var item = document.createElement('div');
      item.className = 'form-pop__item';
      if (campo.classList.contains('form-pop__campo--inteiro')) {
        item.classList.add('form-pop__item--inteiro');
      }

      var legenda = campo.tagName === 'SELECT'
        ? campo.options[0].textContent
        : campo.getAttribute('placeholder');

      var obrig = document.createElement('span');
      obrig.className = 'form-pop__obrig';
      obrig.setAttribute('aria-hidden', 'true');
      obrig.innerHTML = '<span class="form-pop__obrig-texto"></span><span class="form-pop__obrig-marca">*</span>';
      obrig.firstChild.textContent = legenda;

      campo.parentNode.insertBefore(item, campo);
      item.appendChild(campo);
      item.appendChild(obrig);

      function vazio() { return !campo.value.trim(); }

      /* Mensagem de campo vazio em português: a padrão do navegador segue o
         idioma dele (ex.: "Please fill out this field."). Roda depois das
         regras de cada campo, que zeram a mensagem quando o campo está vazio.
         Só espaços também conta como vazio. */
      var MSG_VAZIO = campo.tagName === 'SELECT' ? 'Selecione uma opção.' : 'Preencha este campo.';
      function mensagemVazio() {
        if (vazio()) campo.setCustomValidity(MSG_VAZIO);
        else if (campo.validationMessage === MSG_VAZIO) campo.setCustomValidity('');
      }
      mensagemVazio();
      campo.addEventListener('input', mensagemVazio);
      campo.addEventListener('change', mensagemVazio);
      campo.addEventListener('blur', mensagemVazio);

      /* ao tentar enviar, o navegador dispara 'invalid' em cada campo inválido */
      campo.addEventListener('invalid', function () {
        if (vazio()) {
          item.classList.add('is-erro');
          campo.setAttribute('aria-invalid', 'true');
        }
      });

      function limpar() {
        if (vazio()) return;
        item.classList.remove('is-erro');
        campo.removeAttribute('aria-invalid');
      }
      campo.addEventListener('input', limpar);
      campo.addEventListener('change', limpar);
    });
  }

  /* ===============================================================
     6. SECTION 7 — ACORDEÃO DO FAQ
     =============================================================== */
  function iniciarFaq() {
    document.querySelectorAll('.faq__item').forEach(function (item) {
      var botao = item.querySelector('.faq__pergunta');
      if (!botao) return;

      botao.addEventListener('click', function () {
        var abrindo = !item.classList.contains('is-aberto');

        /* um por vez */
        document.querySelectorAll('.faq__item.is-aberto').forEach(function (outro) {
          outro.classList.remove('is-aberto');
          outro.querySelector('.faq__pergunta').setAttribute('aria-expanded', 'false');
        });

        if (abrindo) {
          item.classList.add('is-aberto');
          botao.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ===============================================================
     7. ANIMAÇÕES DE SCROLL (GSAP + ScrollTrigger)
     Os elementos são marcados no HTML com data-anim / data-anim-grupo /
     data-anim-hero. Nada é escondido pelo CSS depois que isto roda: as
     próprias animações seguram o estado inicial.
     =============================================================== */
  function iniciarAnimacoes() {
    var raiz = document.documentElement;

    /* sem GSAP ou com movimento reduzido: mostra tudo e não anima nada */
    if (reduzirMovimento || !window.gsap || !window.ScrollTrigger) {
      raiz.classList.remove('anim');
      return;
    }

    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    window.__animAtiva = true;

    var DURACAO = 0.7;
    var SUAVIZA = 'power2.out';

    /* hero: entra assim que a página carrega */
    var hero = document.querySelector('[data-anim-hero]');
    if (hero) {
      gsap.fromTo(hero.children,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.8, ease: SUAVIZA, stagger: 0.12, delay: 0.15 });
    }

    /* elementos que entram sozinhos.
       Em "fade" o eixo Y nem é mencionado: bastaria citá-lo pra o GSAP
       assumir o transform e converter o translateX(-50%) do CSS em pixels
       fixos, quebrando a centralização ao redimensionar a janela. */
    gsap.utils.toArray('[data-anim]').forEach(function (el) {
      var soFade = el.getAttribute('data-anim') === 'fade';
      var de = { opacity: 0 };
      var ate = {
        opacity: 1, duration: DURACAO, ease: SUAVIZA,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      };
      if (!soFade) { de.y = 28; ate.y = 0; }
      gsap.fromTo(el, de, ate);
    });

    /* grupos: os filhos entram em cascata */
    gsap.utils.toArray('[data-anim-grupo]').forEach(function (grupo) {
      gsap.fromTo(grupo.children,
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0, duration: DURACAO, ease: SUAVIZA, stagger: 0.1,
          scrollTrigger: { trigger: grupo, start: 'top 80%' }
        });
    });

    /* as animações já fixaram o estado inicial: o CSS pode soltar */
    raiz.classList.remove('anim');

    /* as imagens mudam a altura da página; recalcula os gatilhos */
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* ===============================================================
     BOOT
     =============================================================== */
  function iniciar() {
    iniciarLenis();
    iniciarAncoras();
    iniciarFaixas();
    iniciarCarrossel();
    iniciarDepoimentos();
    iniciarLightbox();
    iniciarFormPop();
    iniciarRegrasForm();
    iniciarFaq();
    iniciarAnimacoes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
