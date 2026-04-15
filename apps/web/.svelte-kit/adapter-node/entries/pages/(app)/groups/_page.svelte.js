import { h as head, a as attr_class, e as ensure_array_like, d as derived } from "../../../../chunks/renderer.js";
import { e as escape_html, a as attr } from "../../../../chunks/attributes.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    const createState = derived(() => form?.createGroup ?? null);
    const joinState = derived(() => form?.joinGroup ?? null);
    const groups = derived(() => data.appShell.groups);
    const onboardingEmpty = derived(() => data.onboardingState === "needs-group");
    head("lr9ync", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Groups • Caluno</title>`);
      });
    });
    $$renderer2.push(`<main class="workspace-shell"><aside class="workspace-rail framed-panel"><p class="eyebrow">Protected shell</p> <h1>${escape_html(data.appShell.viewer.displayName)}</h1> <p class="rail-copy">Group membership, join codes, and calendar scope were resolved on the server before this shell rendered.</p> <div class="status-stack"><article${attr_class(`status-card ${onboardingEmpty() ? "tone-warning" : "tone-neutral"}`)} data-testid="groups-shell"><span class="status-card__label">Onboarding state</span> <strong>${escape_html(onboardingEmpty() ? "onboarding-empty" : "workspace-ready")}</strong> <p>${escape_html(onboardingEmpty() ? "This user does not belong to any groups yet, so the app stays on the onboarding shell." : "You can open only the groups and calendars returned by the trusted app layout load.")}</p></article> `);
    if (joinState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article${attr_class(`status-card ${joinState().status === "timeout" ? "tone-warning" : "tone-danger"}`)} data-testid="join-error-state"><span class="status-card__label">Join action</span> <strong>${escape_html(joinState().status)}</strong> <p>${escape_html(joinState().message)}</p> <code>${escape_html(joinState().reason)}</code></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <nav class="rail-links">`);
    if (data.appShell.primaryCalendar) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<a${attr("href", `/calendars/${data.appShell.primaryCalendar.id}`)}>Open primary calendar</a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <a href="/logout">Sign out</a></nav></aside> <section class="workspace-main"><header class="hero-panel compact"><p class="eyebrow">Membership console</p> <h2>Build or join the calendars your session can actually prove.</h2> <p class="lede">Create a new group when you are starting fresh, or redeem a join code when another member has
        already established the workspace boundary.</p></header> `);
    if (onboardingEmpty()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="feature-banner tone-warning" data-testid="onboarding-empty-state"><span>No memberships loaded</span> <p>This account has not joined any groups yet. Create one or redeem a join code to open the protected app shell.</p></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="action-grid"><article class="framed-panel action-panel"><div><p class="panel-kicker">Create a workspace</p> <h3>Launch a new shared calendar boundary.</h3> <p class="panel-copy">Creating a group also provisions a default calendar and an owner-visible join code on the server.</p></div> <form method="POST" action="?/createGroup" class="stacked-form"><label class="field"><span>Group name</span> <input class="input" name="groupName" placeholder="Night clinic rota"${attr("value", createState()?.fields.groupName ?? "")} required=""/></label> <label class="field"><span>Default calendar name</span> <input class="input" name="calendarName" placeholder="Shared calendar"${attr("value", createState()?.fields.calendarName ?? "")}/></label> `);
    if (createState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div${attr_class(`inline-state ${createState().status === "timeout" ? "tone-warning" : "tone-danger"}`)}><strong>${escape_html(createState().reason)}</strong> <p>${escape_html(createState().message)}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="button button-primary" type="submit">Create protected group</button></form></article> <article class="framed-panel action-panel"><div><p class="panel-kicker">Join existing group</p> <h3>Redeem an invite without widening scope.</h3> <p class="panel-copy">Join codes are normalized and validated server-side, then resolve to the group’s default calendar.</p></div> <form method="POST" action="?/joinGroup" class="stacked-form"><label class="field"><span>Join code</span> <input class="input code-input" name="joinCode" placeholder="ALPHA123"${attr("value", joinState()?.fields.joinCode ?? "")} autocomplete="off" spellcheck="false" required=""/></label> `);
    if (joinState()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div${attr_class(`inline-state ${joinState().status === "timeout" ? "tone-warning" : "tone-danger"}`)}><strong>${escape_html(joinState().reason)}</strong> <p>${escape_html(joinState().message)}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="button button-secondary" type="submit">Redeem join code</button></form></article></section> <section class="group-grid">`);
    if (groups().length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<article class="empty-card framed-panel"><p class="panel-kicker">Awaiting first membership</p> <h3>No permitted groups yet.</h3> <p class="panel-copy">Once a membership exists, the protected layout will render the trusted group and calendar inventory here.</p></article>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(groups());
      for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
        let group = each_array[$$index_1];
        $$renderer2.push(`<article class="group-card framed-panel" data-testid="group-card"><div class="group-card__header"><div><p class="panel-kicker">${escape_html(group.role === "owner" ? "Owner scope" : "Member scope")}</p> <h3>${escape_html(group.name)}</h3></div> <span${attr_class(`pill pill-${group.joinCodeStatus}`)}>${escape_html(group.joinCode ? `${group.joinCodeStatus} join code` : "join code hidden")}</span></div> `);
        if (group.joinCode) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="code-strip"><span>Owner join code</span> <code>${escape_html(group.joinCode)}</code></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="calendar-list"><!--[-->`);
        const each_array_1 = ensure_array_like(group.calendars);
        for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
          let calendar = each_array_1[$$index];
          $$renderer2.push(`<a class="calendar-link"${attr("href", `/calendars/${calendar.id}`)}><strong>${escape_html(calendar.name)}</strong> <span>${escape_html(calendar.isDefault ? "Default calendar" : "Secondary calendar")}</span></a>`);
        }
        $$renderer2.push(`<!--]--></div></article>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></section></section></main>`);
  });
}
export {
  _page as default
};
