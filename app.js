(function(){
  "use strict";

  // ---------- 한글 변환 테이블 ----------

  var GAN_KR = {"甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무","己":"기","庚":"경","辛":"신","壬":"임","癸":"계"};
  var ZHI_KR = {"子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사","午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해"};
  var WUXING_KR = {"木":"목","火":"화","土":"토","金":"금","水":"수"};
  var SIPSUNG_KR = {
    "比肩":"비견", "劫财":"겁재", "劫財":"겁재",
    "食神":"식신", "伤官":"상관", "傷官":"상관",
    "偏财":"편재", "偏財":"편재", "正财":"정재", "正財":"정재",
    "七杀":"편관", "七殺":"편관", "偏官":"편관", "正官":"정관",
    "偏印":"편인", "正印":"정인", "日主":"일주"
  };
  var GAN_WUXING = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
  var WUXING_ORDER = ["木","火","土","金","水"];
  var WUXING_COLOR = {"木":"var(--wood)","火":"var(--fire)","土":"var(--earth)","金":"var(--metal)","水":"var(--water)"};
  var GENERATES = {"木":"火","火":"土","土":"金","金":"水","水":"木"}; // 생아자 반대방향 조회용

  function ganzhiHanja(gan, zhi){ return gan + zhi; }
  function ganzhiKr(gan, zhi){ return GAN_KR[gan] + ZHI_KR[zhi]; }

  // ---------- DOM refs ----------

  var form = document.getElementById("form");
  var resultEl = document.getElementById("result");
  var calTypeSeg = document.getElementById("calType");
  var genderSeg = document.getElementById("gender");
  var leapField = document.getElementById("leapField");
  var timeUnknown = document.getElementById("timeUnknown");
  var timeInput = document.getElementById("time");
  var resetBtn = document.getElementById("resetBtn");

  var state = { calType: "solar", gender: "1" };

  function bindSegmented(container, key){
    container.addEventListener("click", function(e){
      var btn = e.target.closest(".seg-btn");
      if(!btn) return;
      Array.prototype.forEach.call(container.querySelectorAll(".seg-btn"), function(b){
        b.classList.toggle("is-active", b === btn);
      });
      state[key] = btn.getAttribute("data-val");
      if(key === "calType"){
        leapField.hidden = (state.calType !== "lunar");
      }
    });
  }
  bindSegmented(calTypeSeg, "calType");
  bindSegmented(genderSeg, "gender");

  timeUnknown.addEventListener("change", function(){
    timeInput.disabled = timeUnknown.checked;
    if(timeUnknown.checked) timeInput.value = "";
  });

  resetBtn.addEventListener("click", function(){
    resultEl.hidden = true;
    form.hidden = false;
    window.scrollTo({top:0, behavior:"smooth"});
  });

  // ---------- 계산 ----------

  form.addEventListener("submit", function(e){
    e.preventDefault();

    var name = document.getElementById("name").value.trim() || "이";
    var dateVal = document.getElementById("date").value;
    if(!dateVal){ return; }
    var parts = dateVal.split("-").map(Number);
    var y = parts[0], m = parts[1], d = parts[2];

    var hasTime = !timeUnknown.checked && timeInput.value;
    var hh = 12, mm = 0;
    if(hasTime){
      var tp = timeInput.value.split(":").map(Number);
      hh = tp[0]; mm = tp[1];
    }

    var lunar;
    try{
      if(state.calType === "solar"){
        var solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
        lunar = solar.getLunar();
      } else {
        var isLeap = document.getElementById("leap").checked;
        lunar = window.Lunar.fromYmdHms(y, isLeap ? -m : m, d, hh, mm, 0);
      }
    } catch(err){
      alert("입력하신 날짜를 계산할 수 없어요. 날짜를 다시 확인해주세요.\n(" + err.message + ")");
      return;
    }

    render(name, lunar, hasTime, state.gender);
  });

  function render(name, lunar, hasTime, genderVal){
    var bz = lunar.getEightChar();

    var pillarsData = [
      { key:"year",  label:"년주", gan: lunar.getYearGan(),  zhi: lunar.getYearZhi()  },
      { key:"month", label:"월주", gan: lunar.getMonthGan(), zhi: lunar.getMonthZhi() },
      { key:"day",   label:"일주", gan: lunar.getDayGan(),   zhi: lunar.getDayZhi()   },
      { key:"time",  label:"시주", gan: lunar.getTimeGan(),  zhi: lunar.getTimeZhi()  }
    ];

    document.getElementById("resultName").textContent = name + " 님의 사주";
    document.getElementById("resultMeta").textContent =
      lunar.getSolar().toYmd() + " (음력 " + lunar.getYearInGanZhi() + "년 " + lunar.getMonthInChinese() + "월 " + lunar.getDayInChinese() + ")" +
      (hasTime ? "" : " · 시간 미상");

    renderPillars(pillarsData, hasTime);
    var wx = renderWuxing(pillarsData);
    renderSipsung(bz, pillarsData, hasTime);
    renderReading(bz, pillarsData, wx, hasTime);
    renderDaewoon(bz, genderVal, lunar, hasTime);

    form.hidden = true;
    resultEl.hidden = false;
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function renderPillars(pillarsData, hasTime){
    var wrap = document.getElementById("pillars");
    wrap.innerHTML = "";
    pillarsData.forEach(function(p){
      var div = document.createElement("div");
      div.className = "pillar" + (p.key === "day" ? " is-day" : "");
      if(p.key === "time" && !hasTime){
        div.innerHTML =
          '<div class="pillar-label">' + p.label + '</div>' +
          '<div class="pillar-hanja">?</div>' +
          '<div class="pillar-reading">시간 미상</div>';
      } else {
        div.innerHTML =
          '<div class="pillar-label">' + p.label + (p.key==="day" ? " · 본인" : "") + '</div>' +
          '<div class="pillar-hanja">' + p.gan + '<br>' + p.zhi + '</div>' +
          '<div class="pillar-reading">' + ganzhiKr(p.gan, p.zhi) + '</div>';
      }
      wrap.appendChild(div);
    });
  }

  function renderWuxing(pillarsData){
    var score = {"木":0,"火":0,"土":0,"金":0,"水":0};
    pillarsData.forEach(function(p, idx){
      if(idx === 3 && p.gan === "?") return;
      score[GAN_WUXING[p.gan]] += 1;
      score[LunarUtil.WU_XING_ZHI[p.zhi]] += 1;
      var hides = LunarUtil.ZHI_HIDE_GAN[p.zhi] || [];
      hides.forEach(function(hg, i){
        score[GAN_WUXING[hg]] += (i === 0 ? 0.5 : 0.3);
      });
    });
    var total = WUXING_ORDER.reduce(function(s,k){ return s+score[k]; }, 0);

    var wrap = document.getElementById("wuxing");
    wrap.innerHTML = "";
    WUXING_ORDER.forEach(function(k){
      var pct = total ? Math.round(score[k]/total*100) : 0;
      var row = document.createElement("div");
      row.className = "wuxing-row";
      row.innerHTML =
        '<div class="wuxing-name" style="color:'+WUXING_COLOR[k]+'">' + WUXING_KR[k] + '</div>' +
        '<div class="wuxing-track"><div class="wuxing-fill" style="width:'+pct+'%;background:'+WUXING_COLOR[k]+'"></div></div>' +
        '<div class="wuxing-pct">' + pct + '%</div>';
      wrap.appendChild(row);
    });

    return { score: score, total: total };
  }

  function renderSipsung(bz, pillarsData, hasTime){
    var rows = [
      { label:"천간", get: function(key){
          if(key==="year") return bz.getYearShiShenGan();
          if(key==="month") return bz.getMonthShiShenGan();
          if(key==="day") return "일간(본인)";
          if(key==="time") return bz.getTimeShiShenGan();
        }},
      { label:"지지", get: function(key){
          if(key==="year") return bz.getYearShiShenZhi()[0];
          if(key==="month") return bz.getMonthShiShenZhi()[0];
          if(key==="day") return bz.getDayShiShenZhi()[0];
          if(key==="time") return bz.getTimeShiShenZhi()[0];
        }}
    ];

    var table = document.getElementById("sipsungTable");
    var head = "<tr><th></th>" + pillarsData.map(function(p){ return "<th>"+p.label+"</th>"; }).join("") + "</tr>";
    var body = rows.map(function(r){
      var cells = pillarsData.map(function(p){
        if(p.key === "time" && !hasTime) return "<td>—</td>";
        var v = r.get(p.key);
        var kr = SIPSUNG_KR[v] || v;
        return "<td>" + kr + "</td>";
      }).join("");
      return "<tr><th>" + r.label + "</th>" + cells + "</tr>";
    }).join("");
    table.innerHTML = head + body;
  }

  function renderReading(bz, pillarsData, wx, hasTime){
    var dayGan = pillarsData[2].gan;
    var dayEl = GAN_WUXING[dayGan];
    var generatorEl = null;
    Object.keys(GENERATES).forEach(function(k){ if(GENERATES[k] === dayEl) generatorEl = k; });

    var supportRatio = (wx.score[dayEl] + wx.score[generatorEl]) / (wx.total || 1);
    var strengthLine, strengthLabel;
    if(supportRatio < 0.32){
      strengthLabel = "신약(身弱)";
      strengthLine = "일간 " + GAN_KR[dayGan] + WUXING_KR[dayEl] + "를 도와주는 오행(" + WUXING_KR[dayEl] + "·" + WUXING_KR[generatorEl] + ")이 전체의 " + Math.round(supportRatio*100) + "% 정도로, 주변 오행에 비해 힘이 약한 신약 사주로 보여요.";
    } else if(supportRatio > 0.5){
      strengthLabel = "신강(身强)";
      strengthLine = "일간 " + GAN_KR[dayGan] + WUXING_KR[dayEl] + "를 도와주는 오행이 전체의 " + Math.round(supportRatio*100) + "%로 두터운 편이라, 스스로의 힘이 강한 신강 사주로 보여요.";
    } else {
      strengthLabel = "중화(中和)";
      strengthLine = "일간을 돕는 오행과 소모시키는 오행이 " + Math.round(supportRatio*100) + "% 안팎으로 비교적 균형 잡힌 사주예요.";
    }
    document.getElementById("strengthLine").textContent = strengthLine;

    // 팔자 전체 십성 목록 모으기 (한글)
    var all = [];
    all.push(SIPSUNG_KR[bz.getYearShiShenGan()] || bz.getYearShiShenGan());
    all.push(SIPSUNG_KR[bz.getMonthShiShenGan()] || bz.getMonthShiShenGan());
    if(hasTime) all.push(SIPSUNG_KR[bz.getTimeShiShenGan()] || bz.getTimeShiShenGan());
    all.push(SIPSUNG_KR[bz.getYearShiShenZhi()[0]] || bz.getYearShiShenZhi()[0]);
    all.push(SIPSUNG_KR[bz.getMonthShiShenZhi()[0]] || bz.getMonthShiShenZhi()[0]);
    all.push(SIPSUNG_KR[bz.getDayShiShenZhi()[0]] || bz.getDayShiShenZhi()[0]);
    if(hasTime) all.push(SIPSUNG_KR[bz.getTimeShiShenZhi()[0]] || bz.getTimeShiShenZhi()[0]);

    function count(names){ return all.filter(function(x){ return names.indexOf(x) >= 0; }).length; }

    var bullets = [];
    var c;

    c = count(["식신","상관"]);
    if(c >= 2) bullets.push("식신·상관이 여럿 있어 아이디어를 구체적인 결과물로 만들어내는 힘이 좋은 편이에요. 새로운 걸 만들고 표현하는 일에서 에너지를 얻는 타입입니다.");
    else if(c === 1) bullets.push("식신 또는 상관이 하나 있어, 상황에 따라 표현력·기획력을 발휘하는 구간이 있습니다.");

    c = count(["편재","정재"]);
    if(c >= 3) bullets.push("재성이 세 개 이상으로 많은 편이에요. 돈이 될 기회 자체는 자주 오지만, " + (strengthLabel==="신약(身弱)" ? "일간이 약한 상태라 그걸 소화할 체력·판단 여력이 부족해지기 쉬우니 무리한 확장보다는 하나씩 지켜가는 방식이 유리해요." : "일간의 힘도 충분해 기회를 실제 성과로 잘 연결할 수 있는 편이에요."));
    else if(c >= 1) bullets.push("재성이 자리 잡고 있어 실용적인 결과·수치에 대한 감각이 있는 편입니다.");

    c = count(["정관","편관"]);
    if(c >= 2) bullets.push("관성이 여럿이라 규칙·책임 안에서 움직일 때 안정감을 느끼는 편이에요. 다만 너무 몰리면 부담이 커질 수 있어요.");

    c = count(["정인","편인"]);
    if(c >= 2) bullets.push("인성이 든든해서 배움과 직관을 통해 스스로를 채우는 힘이 좋은 편이에요.");
    else if(c === 1 && strengthLabel === "신약(身弱)") bullets.push("인성이 하나 있어 일간을 도와주긴 하지만, 혼자서는 다소 부족해 인성·비겁운이 들어오는 시기에 컨디션이 한결 나아지는 편이에요.");

    c = count(["비견","겁재"]);
    if(c >= 2) bullets.push("비겁이 뚜렷해서 협업하는 동료나 함께 일할 사람이 있을 때 힘을 더 잘 쓰는 편이에요.");

    if(bullets.length === 0) bullets.push("특정 오행이나 십성으로 크게 치우치지 않고 비교적 고르게 분포된 사주예요.");

    var list = document.getElementById("readingList");
    list.innerHTML = bullets.map(function(b){ return "<li>" + b + "</li>"; }).join("");
  }

  function renderDaewoon(bz, genderVal, lunar, hasTime){
    var meta = document.getElementById("daewoonMeta");
    var table = document.getElementById("daewoonTable");

    var yun = bz.getYun(Number(genderVal));
    var list = yun.getDaYun();
    var nowYear = new Date().getFullYear();

    meta.textContent =
      (yun.isForward() ? "순행(順行)" : "역행(逆行)") + " · 대운수 약 " + yun.getStartYear() + "년 " + yun.getStartMonth() + "개월" +
      (hasTime ? "" : " (시간 미상이라 참고값)");

    var rows = list.filter(function(dy){ return dy.getStartYear() > 0; }).slice(0, 8).map(function(dy){
      var gz = dy.getGanZhi();
      if(!gz) return "";
      var gan = gz.charAt(0), zhi = gz.charAt(1);
      var isCurrent = nowYear >= dy.getStartYear() && nowYear <= dy.getEndYear();
      return "<tr class=\"" + (isCurrent ? "is-current" : "") + "\">" +
        "<td>" + dy.getStartYear() + "~" + dy.getEndYear() + "</td>" +
        "<td class=\"hanja-cell\">" + gz + "</td>" +
        "<td>" + ganzhiKr(gan, zhi) + "</td>" +
        "<td>" + dy.getStartAge() + "세~</td>" +
        "</tr>";
    }).join("");

    table.innerHTML =
      "<tr><th>기간</th><th>간지</th><th>한글</th><th>나이</th></tr>" + rows;
  }

  // ---------- PWA: 서비스워커 등록 ----------
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    });
  }

})();
