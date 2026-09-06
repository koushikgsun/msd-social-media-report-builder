"""End-to-end checks in an isolated browser; does not touch the user's saved draft."""
import json
import uuid
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from playwright.sync_api import sync_playwright
from test_report_io import fixture_pptx

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports'
BASE='http://127.0.0.1:5055'

with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1600,'height':1000},accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE)
    assert page.title()=='reporter.io'
    assert page.locator('.editor-block').count()==7
    page.get_by_role('button',name='Settings',exact=True).click()
    page.locator('[data-setting="theme.colors.primary"]').fill('#8844CC')
    page.locator('[data-setting="theme.fonts.primary"]').select_option('Georgia')
    page.locator('[data-setting="theme.roles.heading"]').select_option('primary')
    page.locator('#theme-name').fill('QA Plum')
    page.locator('#save-theme').click()
    page.locator('[data-setting="useDefault"]').check()
    page.get_by_role('button',name='Report',exact=True).click()
    page.locator('[data-setting="report.currency"]').select_option('AED')
    page.locator('[data-setting="report.decimals"]').fill('1')
    page.get_by_role('button',name='Save settings',exact=True).click()
    assert page.locator('.editor-block h2').first.evaluate('e=>getComputedStyle(e).color')=='rgb(136, 68, 204)'
    assert 'Georgia' in page.locator('.editor-block h2').first.evaluate('e=>getComputedStyle(e).fontFamily')
    page.reload()
    assert page.evaluate('ReportApp.getModel().theme.colors.primary')=='#8844CC'
    assert page.evaluate('ReportSettings.getPreferences().presets.length')==1
    # Cancelling and invalid input must not alter the saved theme.
    page.locator('#open-settings').click()
    page.locator('[data-setting="theme.colors.primary"]').fill('#XXFFFF')
    page.get_by_role('button',name='Save settings',exact=True).click()
    assert page.locator('#settings-dialog').is_visible()
    page.locator('#cancel-settings').click()
    assert page.evaluate('ReportApp.getModel().theme.colors.primary')=='#8844CC'
    # Header settings and image upload survive project serialization.
    image=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082')
    page.locator('#header-image').set_input_files({'name':'qa-header.png','mimeType':'image/png','buffer':image})
    page.wait_for_function('ReportApp.getModel().header.backgroundImage')
    page.locator('[data-key="imageFit"]').select_option('contain')
    page.locator('[data-key="align"]').select_option('center')
    page.locator('[data-key="height"]').fill('340');page.locator('[data-key="height"]').press('Tab')
    assert page.locator('#report-header').evaluate('e=>getComputedStyle(e).backgroundSize')=='contain'
    # Rich-text role formatting and live preview.
    text_id=page.evaluate('ReportApp.getModel().blocks.find(b=>b.type==="text").id')
    page.locator(f'[data-id="{text_id}"]').click()
    editor=page.locator('.rich-editor');editor.fill('A clear editable finding.')
    editor.evaluate("e=>{const r=document.createRange();r.selectNodeContents(e);const s=getSelection();s.removeAllRanges();s.addRange(r);e.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))}")
    page.locator('#rich-color').select_option('primary')
    assert page.locator(f'[data-id="{text_id}"] [data-color-role=primary]').inner_text()=='A clear editable finding.'
    with page.expect_download() as download:
        page.locator('#save-project').click()
    project=json.loads(download.value.path().read_text(encoding='utf-8'))
    assert project['header']['backgroundImage'].startswith('data:image/png;base64,')
    assert project['theme']['colors']['primary']=='#8844CC'
    # Fixed presentation canvas and export availability.
    page.locator('#canvas-setup').click();page.locator('#canvas-mode').select_option('presentation');page.locator('#canvas-preset').select_option('wide');page.locator('#canvas-header').uncheck();page.locator('#apply-canvas').click()
    assert page.locator('#export-pptx').is_enabled()
    assert page.locator('#page-list [data-page-select]').count()==1
    page.locator('#add-page').click();n=page.locator('#page-list option').count();page.locator('#duplicate-page').click();assert page.locator('#page-list option').count()==n+1
    # Native PPTX import through UI, retaining all series.
    page.locator('#import-report').set_input_files({'name':'qa-native.pptx','mimeType':'application/vnd.openxmlformats-officedocument.presentationml.presentation','buffer':fixture_pptx()})
    page.locator('#accept-import').click()
    assert page.locator('.editor-block').count()==4
    assert page.locator('.chart-legend span').count()==2
    page.screenshot(path=str(OUT/'qa-imported-editor.png'))
    for fmt in ('pdf','pptx'):
        with page.expect_download(timeout=60000) as download:
            page.locator('#export-'+fmt).click()
        download.value.save_as(OUT/('qa-native.'+fmt))
    with page.expect_download() as download:
        page.locator('#export-report').click()
    download.value.save_as(OUT/'qa-native.html')
    # Template cleaning then reload through the library.
    name='QA disposable '+uuid.uuid4().hex[:8]
    page.locator('#templates').click();page.locator('#template-name').fill(name);page.locator('#save-template').click()
    page.wait_for_function("name=>document.querySelector('.template-card h3')?.textContent===name",arg=name)
    tid=page.locator('[data-use-template]').first.get_attribute('data-use-template')
    response=context.request.get(BASE+'/api/templates/'+tid);raw=response.text();assert 'PRIVATE' not in raw
    page.once('dialog',lambda d:d.accept());page.locator('[data-use-template]').first.click()
    page.wait_for_function("document.querySelector('#canvas').innerText.includes('Lorem ipsum')")
    context.request.delete(BASE+'/api/templates/'+tid)
    # Read the offline HTML with networking disabled.
    offline=context.new_page();offline.on('pageerror',lambda e:errors.append(str(e)));offline.route('http**/*',lambda r:r.abort())
    offline.goto((OUT/'qa-native.html').as_uri());assert offline.locator('.block').count()==4
    offline.screenshot(path=str(OUT/'qa-offline-export.png'),full_page=True)
    assert not errors,errors
    print('PASS: settings persistence, validation/cancel, fonts, header image, rich text, portable project, page controls, native import, HTML/PDF/PPTX downloads, clean templates, offline rendering; no browser errors.')
    browser.close()
