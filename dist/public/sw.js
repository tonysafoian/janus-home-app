/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-20b4bb42'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "placeholder.svg",
    "revision": "35707bd9960ba5281c72af927b79291f"
  }, {
    "url": "icon.svg",
    "revision": "14de981ae6a0d1985d0a9bce356d9197"
  }, {
    "url": "icon.png",
    "revision": "1667e7ade35f92d5817238fee82b2997"
  }, {
    "url": "icon-512.png",
    "revision": "1667e7ade35f92d5817238fee82b2997"
  }, {
    "url": "icon-192.png",
    "revision": "4a702c28c156cd1f88c8c683e126d5c7"
  }, {
    "url": "favicon.ico",
    "revision": "ea6489aea4038bccc95c720d34d3256f"
  }, {
    "url": "_worker.js",
    "revision": "82a50da53689dbdfa0653283f5484cca"
  }, {
    "url": "assets/zap-DL80T-4v.js",
    "revision": null
  }, {
    "url": "assets/xlsxUtils-Dxy9UZVa.js",
    "revision": null
  }, {
    "url": "assets/x-BAy1sRF1.js",
    "revision": null
  }, {
    "url": "assets/wind-D-HVceue.js",
    "revision": null
  }, {
    "url": "assets/wifi-BqpKgbBD.js",
    "revision": null
  }, {
    "url": "assets/webhook-CN731XkZ.js",
    "revision": null
  }, {
    "url": "assets/waves-BRxsClqp.js",
    "revision": null
  }, {
    "url": "assets/volume-2-DnqwKYDf.js",
    "revision": null
  }, {
    "url": "assets/video-TrUVihbB.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-DiLyY5yl.js",
    "revision": null
  }, {
    "url": "assets/vendor-query-BpSKZ4uP.js",
    "revision": null
  }, {
    "url": "assets/vendor-dates-DKdFW5mn.js",
    "revision": null
  }, {
    "url": "assets/vendor-charts-DoStmJWX.js",
    "revision": null
  }, {
    "url": "assets/utils-CKYS_iG0.js",
    "revision": null
  }, {
    "url": "assets/users-DORZqtas.js",
    "revision": null
  }, {
    "url": "assets/user-plus-DdG2zr9F.js",
    "revision": null
  }, {
    "url": "assets/user-BHhT-Fp_.js",
    "revision": null
  }, {
    "url": "assets/useVoiceInput-D8kP4cb8.js",
    "revision": null
  }, {
    "url": "assets/useVerkada-CgtMqwsC.js",
    "revision": null
  }, {
    "url": "assets/useUserRole-B51jCcoG.js",
    "revision": null
  }, {
    "url": "assets/useRealtimeSocket-DumB-4CL.js",
    "revision": null
  }, {
    "url": "assets/useProjects-_LIIMSIX.js",
    "revision": null
  }, {
    "url": "assets/usePWAInstall-byGY4X8-.js",
    "revision": null
  }, {
    "url": "assets/useNotionActivity-DG3ALsoI.js",
    "revision": null
  }, {
    "url": "assets/useHouseholdMembers-DgneR9VR.js",
    "revision": null
  }, {
    "url": "assets/useHomeAssistant-Bwzn4MrE.js",
    "revision": null
  }, {
    "url": "assets/useAvClosetReading-CYFNRAoL.js",
    "revision": null
  }, {
    "url": "assets/use-mobile-YNcpQUQU.js",
    "revision": null
  }, {
    "url": "assets/upload-D6nbRHme.js",
    "revision": null
  }, {
    "url": "assets/trending-up-R4Nr4KZj.js",
    "revision": null
  }, {
    "url": "assets/trash-2--a7myTOu.js",
    "revision": null
  }, {
    "url": "assets/toggle-right-CZeLHz_Z.js",
    "revision": null
  }, {
    "url": "assets/toggle-left-D5qGVam4.js",
    "revision": null
  }, {
    "url": "assets/thermometer-Dw8xnSnY.js",
    "revision": null
  }, {
    "url": "assets/textarea-CuF6xfed.js",
    "revision": null
  }, {
    "url": "assets/tag-DZ_PWga8.js",
    "revision": null
  }, {
    "url": "assets/tabs-LDIhHLH-.js",
    "revision": null
  }, {
    "url": "assets/switch-BaUnKrsI.js",
    "revision": null
  }, {
    "url": "assets/sun-DQ5ehKyI.js",
    "revision": null
  }, {
    "url": "assets/square-plus-csZ4ochM.js",
    "revision": null
  }, {
    "url": "assets/sparkles-CxZVfj-P.js",
    "revision": null
  }, {
    "url": "assets/slider-BeQ2cuNP.js",
    "revision": null
  }, {
    "url": "assets/shopping-cart-xNPeZCp2.js",
    "revision": null
  }, {
    "url": "assets/shield-alert-ANeEeOsA.js",
    "revision": null
  }, {
    "url": "assets/shield-D2rW1BgQ.js",
    "revision": null
  }, {
    "url": "assets/sheet-B9T9Hx6L.js",
    "revision": null
  }, {
    "url": "assets/shared-DQ72Q9i7.js",
    "revision": null
  }, {
    "url": "assets/settings-D7D4JOWv.js",
    "revision": null
  }, {
    "url": "assets/settings-2-CUT8-gXl.js",
    "revision": null
  }, {
    "url": "assets/send-CY4rZVme.js",
    "revision": null
  }, {
    "url": "assets/select-Bssj6TJ9.js",
    "revision": null
  }, {
    "url": "assets/search-DPLJtXgP.js",
    "revision": null
  }, {
    "url": "assets/scroll-area-BRH9FgWQ.js",
    "revision": null
  }, {
    "url": "assets/save-DnRMW5Hn.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-BCiCTKAo.js",
    "revision": null
  }, {
    "url": "assets/repeat-C4MJ6ffs.js",
    "revision": null
  }, {
    "url": "assets/radio-ghlGJyR4.js",
    "revision": null
  }, {
    "url": "assets/plus-DtNHUAa_.js",
    "revision": null
  }, {
    "url": "assets/play-DeT_N2yS.js",
    "revision": null
  }, {
    "url": "assets/plane-CbPbB9Ly.js",
    "revision": null
  }, {
    "url": "assets/pencil-B878066F.js",
    "revision": null
  }, {
    "url": "assets/paperclip-CowIkHiA.js",
    "revision": null
  }, {
    "url": "assets/package-open-kcu6RKqp.js",
    "revision": null
  }, {
    "url": "assets/mic-off-q4aYJYv2.js",
    "revision": null
  }, {
    "url": "assets/mic-B7g1uJ3v.js",
    "revision": null
  }, {
    "url": "assets/message-square-DeO8vKhF.js",
    "revision": null
  }, {
    "url": "assets/map-pin-DjLSeGlH.js",
    "revision": null
  }, {
    "url": "assets/mail-CBGHzCQa.js",
    "revision": null
  }, {
    "url": "assets/list-checks-C80-BR30.js",
    "revision": null
  }, {
    "url": "assets/lightbulb-D26SOO93.js",
    "revision": null
  }, {
    "url": "assets/lib-lfm5wEiO.js",
    "revision": null
  }, {
    "url": "assets/lib-BUD0D3GZ.js",
    "revision": null
  }, {
    "url": "assets/layout-dashboard-DXLS0Z_5.js",
    "revision": null
  }, {
    "url": "assets/label-CZXoNylr.js",
    "revision": null
  }, {
    "url": "assets/janus-icon-BbtWfLjn.png",
    "revision": null
  }, {
    "url": "assets/janus-icon-BDlnujBb.js",
    "revision": null
  }, {
    "url": "assets/input-BBHT9oBV.js",
    "revision": null
  }, {
    "url": "assets/index-DuUyliRd.js",
    "revision": null
  }, {
    "url": "assets/index-CxPccfdV.css",
    "revision": null
  }, {
    "url": "assets/folder-open-Cz9KfPH5.js",
    "revision": null
  }, {
    "url": "assets/flower-2-CDyIO9KD.js",
    "revision": null
  }, {
    "url": "assets/filter-pZy-OQdW.js",
    "revision": null
  }, {
    "url": "assets/film-BG8avtgy.js",
    "revision": null
  }, {
    "url": "assets/file-text-ByjqC9AZ.js",
    "revision": null
  }, {
    "url": "assets/eye-Ve54JdF_.js",
    "revision": null
  }, {
    "url": "assets/external-link-DsJZMLvX.js",
    "revision": null
  }, {
    "url": "assets/es2015-BP6ka3tU.js",
    "revision": null
  }, {
    "url": "assets/droplets-CwC5hVsx.js",
    "revision": null
  }, {
    "url": "assets/download-Ah7tqw16.js",
    "revision": null
  }, {
    "url": "assets/door-open-CB0545-2.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-BqbAP34S.js",
    "revision": null
  }, {
    "url": "assets/dist-Dacd2b-5.js",
    "revision": null
  }, {
    "url": "assets/dist-Cu90o_9l.js",
    "revision": null
  }, {
    "url": "assets/dist-C5tQqdz6.js",
    "revision": null
  }, {
    "url": "assets/dist-C2J943E6.js",
    "revision": null
  }, {
    "url": "assets/dist-Bo1H6X2q.js",
    "revision": null
  }, {
    "url": "assets/dist-BKy4h1IP.js",
    "revision": null
  }, {
    "url": "assets/createLucideIcon-6n0dLw6x.js",
    "revision": null
  }, {
    "url": "assets/collapsible-rdyuBvhX.js",
    "revision": null
  }, {
    "url": "assets/code-DcFJYtNp.js",
    "revision": null
  }, {
    "url": "assets/cloud-_YyA5a-N.js",
    "revision": null
  }, {
    "url": "assets/clock-3-C4theZ1C.js",
    "revision": null
  }, {
    "url": "assets/claude-icon-Bb7_g8BE.png",
    "revision": null
  }, {
    "url": "assets/circle-minus-_NTj2Brb.js",
    "revision": null
  }, {
    "url": "assets/circle-check-big-hlUnq4BQ.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-CuLlxNs4.js",
    "revision": null
  }, {
    "url": "assets/chevron-right-B89fE3x7.js",
    "revision": null
  }, {
    "url": "assets/chevron-left-bDhSi3lP.js",
    "revision": null
  }, {
    "url": "assets/chevron-down-Ieovz9Jy.js",
    "revision": null
  }, {
    "url": "assets/check-DReuyyW3.js",
    "revision": null
  }, {
    "url": "assets/chart-column-D3DNMUu3.js",
    "revision": null
  }, {
    "url": "assets/card-DJjKpRBe.js",
    "revision": null
  }, {
    "url": "assets/car-GmWZ3F86.js",
    "revision": null
  }, {
    "url": "assets/camera-DI_cSu57.js",
    "revision": null
  }, {
    "url": "assets/calendar-days-6sapM8EN.js",
    "revision": null
  }, {
    "url": "assets/calendar-clock-CxrcZkZm.js",
    "revision": null
  }, {
    "url": "assets/calendar-Cw_6FjZr.js",
    "revision": null
  }, {
    "url": "assets/button-BMQCQjCI.js",
    "revision": null
  }, {
    "url": "assets/brain-BJsDe4Dj.js",
    "revision": null
  }, {
    "url": "assets/book-open-pxMP2zcy.js",
    "revision": null
  }, {
    "url": "assets/battery-low-Bzb4dP7m.js",
    "revision": null
  }, {
    "url": "assets/badge-BmX20xMU.js",
    "revision": null
  }, {
    "url": "assets/avatar-CcMTMWPc.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-CFneGQz7.js",
    "revision": null
  }, {
    "url": "assets/arrow-left-CEe_B3l1.js",
    "revision": null
  }, {
    "url": "assets/apiClient-Dsebq7XC.js",
    "revision": null
  }, {
    "url": "assets/alert-dialog-LVowI1ny.js",
    "revision": null
  }, {
    "url": "assets/activity-BAivTYOe.js",
    "revision": null
  }, {
    "url": "assets/accordion-CNy1B1U4.js",
    "revision": null
  }, {
    "url": "assets/Weather-D-LBYqHj.js",
    "revision": null
  }, {
    "url": "assets/Updates-ANiUu2lu.js",
    "revision": null
  }, {
    "url": "assets/TimeAdmin-D0AnRvXx.js",
    "revision": null
  }, {
    "url": "assets/Time-DX7iEVNP.js",
    "revision": null
  }, {
    "url": "assets/TeslaCallback-BsSnnlvv.js",
    "revision": null
  }, {
    "url": "assets/SystemCard-Cn4OSinC.js",
    "revision": null
  }, {
    "url": "assets/Settings-CzisYMLb.js",
    "revision": null
  }, {
    "url": "assets/SecurityCameras-Ba8F_uXf.js",
    "revision": null
  }, {
    "url": "assets/Search-5NzTiDsG.js",
    "revision": null
  }, {
    "url": "assets/SaunaLogicCard-Daq-ba_h.js",
    "revision": null
  }, {
    "url": "assets/ResetPassword-B_LupG4W.js",
    "revision": null
  }, {
    "url": "assets/Projects-6V9E6lY5.js",
    "revision": null
  }, {
    "url": "assets/ProjectWorkspace-CcYTWlGz.js",
    "revision": null
  }, {
    "url": "assets/ProductivityDay-Cpdvz0Xm.js",
    "revision": null
  }, {
    "url": "assets/PoolTempChart-Ce03s6E9.js",
    "revision": null
  }, {
    "url": "assets/NotionActivityChart-B9KGP3Wg.js",
    "revision": null
  }, {
    "url": "assets/NotFound-CXuhDVJM.js",
    "revision": null
  }, {
    "url": "assets/MobileBottomNav-DDsZo2jG.js",
    "revision": null
  }, {
    "url": "assets/JanusFullscreen-C4AoSfL-.js",
    "revision": null
  }, {
    "url": "assets/JanusDrawer-BMbnGp_L.js",
    "revision": null
  }, {
    "url": "assets/Install-iJePDGDE.js",
    "revision": null
  }, {
    "url": "assets/Index-PPvG89ly.js",
    "revision": null
  }, {
    "url": "assets/Iaqualink-CBhpxR0-.js",
    "revision": null
  }, {
    "url": "assets/HomeSystems-rbDh_QQl.js",
    "revision": null
  }, {
    "url": "assets/HomePage-CjbgjGMk.js",
    "revision": null
  }, {
    "url": "assets/GoogleCallback-D4a1yUP_.js",
    "revision": null
  }, {
    "url": "assets/Family-4j5lw9_W.js",
    "revision": null
  }, {
    "url": "assets/DashboardProductivity-BmcyEvjO.js",
    "revision": null
  }, {
    "url": "assets/DashboardNav-B5PRHvbP.js",
    "revision": null
  }, {
    "url": "assets/DashboardHeader-BW-kyTVu.js",
    "revision": null
  }, {
    "url": "assets/DashboardGreeting-N9aryevY.js",
    "revision": null
  }, {
    "url": "assets/Dashboard-BaU_vcCs.js",
    "revision": null
  }, {
    "url": "assets/Automations-DL11YEae.js",
    "revision": null
  }, {
    "url": "assets/AmazonOrder-BCOiNZDA.js",
    "revision": null
  }, {
    "url": "assets/Admin-CcbX4hi-.js",
    "revision": null
  }, {
    "url": "assets/Activity-BTs9ARgj.js",
    "revision": null
  }, {
    "url": "icon.svg",
    "revision": "14de981ae6a0d1985d0a9bce356d9197"
  }, {
    "url": "manifest.webmanifest",
    "revision": "2d435751b484c3716cbf0511627bfb6a"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(({
    request
  }) => request.mode === "navigate", new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
