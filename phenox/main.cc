// addon.cc
#include <node.h>
#include <v8.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <errno.h>
#include <sys/mman.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <signal.h>
#include <time.h>
#include <sys/time.h>
#include <termios.h>
#include <sys/ioctl.h>
#include "cv.h"
#include "cxcore.h"
#include "highgui.h"
#include "pxlib.h"
#include <iostream>
#include "ArrayBuffer.h"


px_imgfeature *ft;
int ftstate = 0;
const int ftmax = 200;
CvMat *mat;

int param[]={CV_IMWRITE_JPEG_QUALITY,70};
IplImage *testImage;    
int  count = 0;


static void timerhandler(int i);
static void setup_timer();

static char timer_disable = 0;

typedef struct _joystick_data {
  float dx;
  float dy;
} joystick_data;


class StaticArrayBufferAllocator : public v8::ArrayBuffer::Allocator {
  public:
    virtual void* Allocate(size_t length) {
        return calloc(length,1);
    }
    virtual void* AllocateUninitialized(size_t length) {
        return malloc(length);
    }
    // XXX we assume length is not needed
    virtual void Free(void*data, size_t length) {
        free(data);
    }
};


using namespace v8;

void InitPhenox(const FunctionCallbackInfo<Value>& args)
{

  //client
  //!client
   
  pxinit_chain();  
  setup_timer();
  while(!pxget_cpu1ready());
  

  //featurelog
  ft =(px_imgfeature *)calloc(ftmax,sizeof(px_imgfeature));
  //!featurelog
}

void GetData(const FunctionCallbackInfo<Value>& args) {
    int i,j;
    if (mat) {
        cvReleaseMat(&mat);//20141101
        mat = NULL;
    }
    if(pxget_imgfullwcheck(0,&testImage) == 1) {  
    //featurelog
        Isolate* isolate = Isolate::GetCurrent();
        HandleScope scope(isolate);
        Local<Object> obj = Object::New(isolate);


        if(ftstate == 1) {
            int ftnum = pxget_imgfeature(ft,ftmax);
            Handle<Array>  rows = Array::New(isolate);
            if(ftnum >= 0) {
                for(i = 0;i < ftnum;i++) {
                    Handle<Object> feature_point = Object::New(isolate);
                    feature_point->Set(String::NewFromUtf8(isolate, "cx"), Number::New(isolate, ft[i].cx));
                    feature_point->Set(String::NewFromUtf8(isolate, "cy"), Number::New(isolate, ft[i].cy));
                    feature_point->Set(String::NewFromUtf8(isolate, "pcx"), Number::New(isolate, ft[i].pcx));
                    feature_point->Set(String::NewFromUtf8(isolate, "pcy"), Number::New(isolate, ft[i].pcy));
                    
                    //cvCircle(testImage,cvPoint((int)ft[i].pcx,(int)ft[i].pcy),2,CV_RGB(255,255,0),1,8,0);
                    //cvCircle(testImage,cvPoint((int)ft[i].cx,(int)ft[i].cy),2,CV_RGB(0,255,0),1,8,0);
                    //cvLine(testImage,cvPoint((int)ft[i].pcx,(int)ft[i].pcy),cvPoint((int)ft[i].cx,(int)ft[i].cy),CV_RGB(0,0,255),1,8,0);
                    printf("%.0f %.0f %.0f %.0f\n",ft[i].pcx,ft[i].pcy,ft[i].cx,ft[i].cy);
                }
                ftstate = 0;
            }
        }
        if(pxset_imgfeature_query(0) == 1) {
            ftstate = 1;
        }
    //!featurelog

        mat = cvEncodeImage(".jpeg",testImage,param); 
        unsigned char *buff = mat->data.ptr;
        int buffsize = mat->step;
        printf("CPU0:image:%d %d\n",count,buffsize);
        count++;

        v8::Handle<v8::Object> external_array = v8::Object::New(isolate);
        external_array->SetIndexedPropertiesToExternalArrayData(buff, v8::kExternalUnsignedByteArray, buffsize);

        obj->Set(String::NewFromUtf8(isolate, "array"), external_array);
        obj->Set(String::NewFromUtf8(isolate, "length"), Number::New(isolate, buffsize));
        obj->Set(String::NewFromUtf8(isolate, "features"), Number::New(isolate, buffsize));
        
        //Isolate::GetCurrent()->AdjustAmountOfExternalAllocatedMemory(buffsize);
        args.GetReturnValue().Set(obj);


    } else {
        args.GetReturnValue().SetUndefined();
    }
}

static void setup_timer() {
  struct sigaction action;
  struct itimerval timer;
  
  memset(&action, 0, sizeof(action));
  
  action.sa_handler = timerhandler;
  action.sa_flags = SA_RESTART;
  sigemptyset(&action.sa_mask);
  if(sigaction(SIGALRM, &action, NULL) < 0){
    perror("sigaction error");
    exit(1);
  }
  
  /* set intarval timer (10ms) */
  timer.it_value.tv_sec = 0;
  timer.it_value.tv_usec = 10000;
  timer.it_interval.tv_sec = 0;
  timer.it_interval.tv_usec = 10000;
  if(setitimer(ITIMER_REAL, &timer, NULL) < 0){
    perror("setitimer error");
    exit(1);
  }
}

void timerhandler(int i) {
  char c;  

  if(timer_disable == 1) {
    return;
  }

  pxset_keepalive();
  pxset_systemlog();

  //dualimage
  pxset_img_seq(0);

  px_selfstate st;
  pxget_selfstate(&st);

  static unsigned long msec_cnt = 0;
  msec_cnt++;
  if(!(msec_cnt % 2)){
    float blobx,bloby,blobsize;
    int ret = pxget_blobmark(&blobx,&bloby,&blobsize);
    if(ret == 1) {
      //printf("%.2f %.2f %.2f %.2f %.2f %.2f %.2f (%.0f %.0f) = %.0f\n",st.degx,st.degy,st.degz,st.vision_tx,st.vision_ty,st.vision_tz,st.height,blobx,bloby,blobsize);
      pxset_blobmark_query(0,-1,300,-128,-3,-128,-3);
    }
  } 

  static int prev_operatemode = 0;
  static int idletime = 0;
  if((prev_operatemode == 1) && (pxget_operate_mode() == 2)) {
    pxset_visioncontrol_xy(st.vision_tx,st.vision_ty);    
  }
  prev_operatemode = pxget_operate_mode();

  if(pxget_whisle_detect() == 1) {
    pxset_whisle_detect(0);
    if(pxget_operate_mode() == 2) {
      pxset_operate_mode(3);//down state
    }      
    else if(pxget_operate_mode() == 0) {
      pxset_rangecontrol_z(65);
      pxset_operate_mode(1);//up state           
    }      
  }

  if(pxget_battery() == 1) {
    timer_disable = 1;
    pxclose_chain();
    system("umount /mnt\n");
    system("shutdown -h now\n");   
    exit(1);
  }
    
  return;
}

void SetPositionXY(const FunctionCallbackInfo<Value>& args) {
      px_selfstate st;
    Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if (args.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong number of arguments")));
    return;
  }

  if (!args[0]->IsNumber() || !args[1]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong arguments")));
    return;
  }

  pxget_selfstate(&st);
  if(pxget_operate_mode() == 2) {
    pxset_visioncontrol_xy(st.vision_tx + args[0]->NumberValue(),st.vision_ty + args[1]->NumberValue());    
  }
}
void SetAngles(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if (args.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong number of arguments")));
    return;
  }

  if (!args[0]->IsNumber() || !args[1]->IsNumber()/* || !args[2]->IsNumber()*/) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong arguments")));
    return;
  }

  if(pxget_operate_mode() == 2) {
    pxset_dst_degx(args[0]->NumberValue());
    pxset_dst_degy(args[1]->NumberValue());
    //pxset_dst_degz(args[2]->NumberValue());
    //pxset_visioncontrol_xy(st.vision_tx + args[0]->NumberValue(),st.vision_ty + args[1]->NumberValue());    
  }
}

void GoDown(const FunctionCallbackInfo<Value>& args) {
    if(pxget_operate_mode() == 2) {

      pxset_operate_mode(3);//down state
  }
}

void GoUp(const FunctionCallbackInfo<Value>& args) {
    if(pxget_operate_mode() == 0) {

      pxset_rangecontrol_z(65);
      pxset_operate_mode(1);//up state           
  }
}


void Init(Handle<Object> exports) {
  NODE_SET_METHOD(exports, "init", InitPhenox);
  NODE_SET_METHOD(exports, "get_data", GetData);
  NODE_SET_METHOD(exports, "set_pos", SetPositionXY);
  NODE_SET_METHOD(exports, "set_angles", SetAngles);
  NODE_SET_METHOD(exports, "go_down", GoDown);
  NODE_SET_METHOD(exports, "go_up", GoUp);
}

NODE_MODULE(phenox, Init)