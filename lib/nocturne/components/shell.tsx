// The Nocturne stage round Hyper's terminals: a dark study, a sheet of paper standing in a 3D
// typewriter, the light on the page, and the Studio.
//
// Hyper's header and terminals are rendered unchanged inside it. The DOM tree is the same in every
// mode (classic theme, focus mode, effects off), only styles change, so switching never remounts
// a terminal. Every canvas ignores the pointer; clicks, selection and input go to xterm.js.

import {ipcRenderer} from 'electron';
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

import {activePaper, activeTheme} from '../../../app/nocturne/apply-config';
import {stageLayout} from '../../../app/nocturne/stage-layout';
import type {Box} from '../../../app/nocturne/stage-layout';
import {StageController} from '../stage-controller';
import {getSettings, updateSettings, useNocturneSettings} from '../store';
import {themeVariables} from '../theme-css';
import {observeKeys} from '../typewriter/keys';

import {Studio} from './studio';
import {Toolbar} from './toolbar';

type ShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
};

type Size = {width: number; height: number};

const boxStyle = (box: Box, origin: {x: number; y: number} = {x: 0, y: 0}): React.CSSProperties => ({
  left: box.x - origin.x,
  top: box.y - origin.y,
  width: box.width,
  height: box.height
});

export function NocturneShell({header, children}: ShellProps) {
  const settings = useNocturneSettings();
  const theme = activeTheme(settings);
  const [studioOpen, setStudioOpen] = useState(false);
  const [size, setSize] = useState<Size | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const machineRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<StageController | null>(null);

  const machineVisible = theme !== null && !settings.focusMode && settings.typewriter.carriage;
  const layout = useMemo(() => {
    return size ? stageLayout(size.width, size.height, machineVisible) : null;
  }, [size, machineVisible]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const measure = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      setSize((previous) => (previous?.width === width && previous.height === height ? previous : {width, height}));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const paper = paperRef.current;
    const glow = glowRef.current;
    const ink = inkRef.current;
    const machine = machineRef.current;
    if (!stage || !paper || !glow || !ink || !machine) {
      return;
    }
    const director = new StageController({stage, paper, glow, ink, machine}, getSettings());
    controller.current = director;
    const stopObservingKeys = observeKeys();
    return () => {
      stopObservingKeys();
      director.dispose();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (layout) {
      controller.current?.update(settings, layout);
    }
  }, [settings, layout]);

  // Commands from the View menu and keyboard shortcuts (see app/commands.ts).
  useEffect(() => {
    const onCommand = (_event: Electron.IpcRendererEvent, name: string) => {
      const current = getSettings();
      if (name === 'focus-mode') {
        updateSettings({focusMode: !current.focusMode});
      } else if (name === 'lighting') {
        updateSettings({lighting: {enabled: !current.lighting.enabled}});
      } else if (name === 'sound') {
        updateSettings({typewriter: {sound: !current.typewriter.sound}});
      } else if (name === 'studio') {
        setStudioOpen((open) => !open);
      }
    };
    ipcRenderer.on('nocturne:command', onCommand);
    return () => {
      ipcRenderer.removeListener('nocturne:command', onCommand);
    };
  }, []);

  const classes = ['tn-root'];
  let style: React.CSSProperties | undefined;
  if (theme) {
    classes.push('tn-nocturne', `tn-${activePaper(settings).appearance}`);
    if (settings.focusMode) {
      classes.push('tn-focus');
    }
    if (!settings.effects || settings.focusMode) {
      classes.push('tn-quiet');
    }
    if (studioOpen) {
      classes.push('tn-studio-open');
    }
    style = themeVariables(theme, settings);
  } else {
    classes.push('tn-classic');
  }
  const nocturne = theme !== null && layout !== null;
  const sheetStyle = nocturne ? boxStyle(layout.sheet) : undefined;
  const textStyle = nocturne ? boxStyle(layout.text, layout.sheet) : undefined;

  return (
    <div className={classes.join(' ')} style={style}>
      {header}
      <div className="tn-stage" ref={stageRef}>
        <div className="tn-sheet" style={sheetStyle}>
          <div className="tn-text" style={textStyle}>
            {children}
          </div>
          <canvas className="tn-layer tn-ink" ref={inkRef} />
          <canvas className="tn-layer tn-paper-light" ref={paperRef} />
          <canvas className="tn-layer tn-glow" ref={glowRef} />
        </div>
        <canvas className="tn-machine" ref={machineRef} hidden={!nocturne || !layout.machine} />
        <div className="tn-vignette" />
        {theme ? (
          <Toolbar settings={settings} studioOpen={studioOpen} onStudio={() => setStudioOpen(!studioOpen)} />
        ) : null}
      </div>
      {theme && studioOpen ? <Studio settings={settings} onClose={() => setStudioOpen(false)} /> : null}
    </div>
  );
}
